using System.Data;
using System.Security.Cryptography;
using System.Text;
using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Enums;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EdificiosOliva.Infrastructure.Services;

public sealed class PaymentIntentService(
    ApplicationDbContext dbContext,
    IEnumerable<IPaymentGateway> gateways,
    ILogger<PaymentIntentService> logger) : IPaymentIntentService
{
    private const string DefaultCurrency = "USD";
    private static readonly TimeSpan DefaultIntentLifetime = TimeSpan.FromMinutes(30);

    public async Task<PagedResult<PaymentIntentResponse>> GetPagedAsync(
        PaymentIntentQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.PaymentIntents
            .AsNoTracking()
            .Include(intent => intent.Reservation)
                .ThenInclude(reservation => reservation.Customer)
            .Include(intent => intent.Reservation)
                .ThenInclude(reservation => reservation.Apartment)
            .Where(intent => !intent.IsDeleted);

        if (!string.IsNullOrWhiteSpace(parameters.Search))
        {
            var search = parameters.Search.Trim();
            query = query.Where(intent =>
                intent.Reservation.Customer.Name.Contains(search) ||
                intent.Reservation.Customer.Email.Contains(search) ||
                intent.Reservation.Apartment.Name.Contains(search) ||
                intent.IdempotencyKey.Contains(search) ||
                (intent.ProviderReference != null && intent.ProviderReference.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(parameters.Provider))
        {
            var provider = CanonicalizeProvider(parameters.Provider);
            query = query.Where(intent => intent.Provider == provider);
        }

        if (parameters.Status.HasValue)
        {
            query = query.Where(intent => intent.Status == parameters.Status.Value);
        }

        if (parameters.ReservationId.HasValue)
        {
            query = query.Where(intent => intent.ReservationId == parameters.ReservationId.Value);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var entities = await query
            .OrderByDescending(intent => intent.CreatedAtUtc)
            .Skip((parameters.Page - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .ToListAsync(cancellationToken);

        var items = entities.Select(MapResponse).ToList();

        return new PagedResult<PaymentIntentResponse>(
            items,
            parameters.Page,
            parameters.PageSize,
            totalItems);
    }

    public async Task<PaymentIntentResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var intent = await dbContext.PaymentIntents
            .AsNoTracking()
            .Include(item => item.Reservation)
                .ThenInclude(reservation => reservation.Customer)
            .Include(item => item.Reservation)
                .ThenInclude(reservation => reservation.Apartment)
            .SingleOrDefaultAsync(
                item => item.Id == id && !item.IsDeleted,
                cancellationToken);

        return intent is null ? null : MapResponse(intent);
    }

    public IReadOnlyCollection<PaymentProviderResponse> GetProviders()
    {
        return gateways
            .GroupBy(
                gateway => CanonicalizeProvider(gateway.Provider),
                StringComparer.OrdinalIgnoreCase)
            .Select(group => new PaymentProviderResponse(
                group.Key,
                group.First().Method))
            .OrderBy(provider => provider.Provider)
            .ToArray();
    }

    public async Task<PaymentIntentResponse> CreateAsync(
        CreatePaymentIntentRequest request,
        CancellationToken cancellationToken = default)
    {
        var provider = CanonicalizeProvider(request.Provider);
        var idempotencyKey = request.IdempotencyKey.Trim();
        var gateway = GetGateway(provider);

        PaymentIntent intent;
        Reservation reservation;

        await using (var transaction = await dbContext.Database.BeginTransactionAsync(
                         IsolationLevel.Serializable,
                         cancellationToken))
        {
            try
            {
                var existing = await FindByIdempotencyKeyAsync(
                    idempotencyKey,
                    cancellationToken);

                if (existing is not null)
                {
                    EnsureIdempotencyScope(existing, request.ReservationId, provider);
                    await transaction.CommitAsync(cancellationToken);

                    return CanResumeGatewayCreation(existing)
                        ? await InitializeGatewayIntentAsync(existing, existing.Reservation, gateway, cancellationToken)
                        : MapResponse(existing);
                }

                reservation = await dbContext.Reservations
                    .Include(item => item.Customer)
                    .Include(item => item.Apartment)
                    .SingleOrDefaultAsync(
                        item => item.Id == request.ReservationId && !item.IsDeleted,
                        cancellationToken)
                    ?? throw new KeyNotFoundException("La reserva indicada no existe.");

                if (reservation.Status == ReservationStatus.Cancelled)
                {
                    throw new InvalidOperationException(
                        "No se puede iniciar un pago para una reserva cancelada.");
                }

                var paidAmount = await dbContext.Payments
                    .Where(payment =>
                        !payment.IsDeleted &&
                        payment.ReservationId == reservation.Id &&
                        payment.Status == PaymentStatus.Paid)
                    .SumAsync(payment => (decimal?)payment.Amount, cancellationToken) ?? 0m;

                var outstandingAmount = reservation.TotalAmount - paidAmount;
                if (outstandingAmount <= 0m)
                {
                    throw new InvalidOperationException(
                        "La reserva no tiene un saldo pendiente de pago.");
                }

                var now = DateTime.UtcNow;
                var hasActiveIntent = await dbContext.PaymentIntents
                    .AsNoTracking()
                    .AnyAsync(
                        item =>
                            !item.IsDeleted &&
                            item.ReservationId == reservation.Id &&
                            item.ExpiresAtUtc > now &&
                            (item.Status == PaymentIntentStatus.Created ||
                             item.Status == PaymentIntentStatus.Processing ||
                             item.Status == PaymentIntentStatus.RequiresAction),
                        cancellationToken);

                if (hasActiveIntent)
                {
                    throw new InvalidOperationException(
                        "Ya existe un intento de pago activo para esta reserva.");
                }

                intent = new PaymentIntent
                {
                    ReservationId = reservation.Id,
                    Reservation = reservation,
                    Amount = outstandingAmount,
                    Currency = DefaultCurrency,
                    Provider = provider,
                    Method = gateway.Method,
                    Status = PaymentIntentStatus.Created,
                    IdempotencyKey = idempotencyKey,
                    ExpiresAtUtc = now.Add(DefaultIntentLifetime),
                };

                dbContext.PaymentIntents.Add(intent);
                await dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync(cancellationToken);
                dbContext.ChangeTracker.Clear();

                var concurrent = await FindByIdempotencyKeyAsync(
                    idempotencyKey,
                    cancellationToken);

                if (concurrent is not null)
                {
                    EnsureIdempotencyScope(concurrent, request.ReservationId, provider);

                    return CanResumeGatewayCreation(concurrent)
                        ? await InitializeGatewayIntentAsync(
                            concurrent,
                            concurrent.Reservation,
                            gateway,
                            cancellationToken)
                        : MapResponse(concurrent);
                }

                throw;
            }
        }

        return await InitializeGatewayIntentAsync(
            intent,
            reservation,
            gateway,
            cancellationToken);
    }

    public async Task<PaymentWebhookProcessResponse> ProcessWebhookAsync(
        string provider,
        string payload,
        IReadOnlyDictionary<string, string> headers,
        CancellationToken cancellationToken = default)
    {
        var canonicalProvider = CanonicalizeProvider(provider);
        var gateway = GetGateway(canonicalProvider);
        var gatewayResult = await gateway.ParseWebhookAsync(
            new PaymentGatewayWebhookRequest(payload, headers),
            cancellationToken);

        if (string.IsNullOrWhiteSpace(gatewayResult.EventId))
        {
            throw new ArgumentException(
                "El webhook no contiene un identificador de evento válido.");
        }

        var eventId = TrimTo(gatewayResult.EventId, 200);
        var eventType = TrimTo(
            string.IsNullOrWhiteSpace(gatewayResult.EventType)
                ? "unknown"
                : gatewayResult.EventType,
            100);
        var providerReference = TrimToOptional(gatewayResult.ProviderReference, 200);
        var payloadHash = Convert.ToHexString(
                SHA256.HashData(Encoding.UTF8.GetBytes(payload)))
            .ToLowerInvariant();

        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        try
        {
            var duplicate = await dbContext.PaymentWebhookEvents
                .AsNoTracking()
                .Where(item =>
                    item.Provider == canonicalProvider &&
                    item.EventId == eventId)
                .Select(item => new { item.PaymentIntentId })
                .SingleOrDefaultAsync(cancellationToken);

            if (duplicate is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new PaymentWebhookProcessResponse(
                    PaymentWebhookOutcome.Duplicate,
                    duplicate.PaymentIntentId);
            }

            var webhook = new PaymentWebhookEvent
            {
                Provider = canonicalProvider,
                EventId = eventId,
                EventType = eventType,
                ProviderReference = providerReference,
                Status = PaymentWebhookEventStatus.Received,
                SignatureVerified = gatewayResult.SignatureVerified,
                PayloadHash = payloadHash,
            };

            dbContext.PaymentWebhookEvents.Add(webhook);

            if (!gatewayResult.SignatureVerified)
            {
                webhook.Status = PaymentWebhookEventStatus.Ignored;
                webhook.ErrorMessage = "La firma del webhook no pudo verificarse.";
                webhook.ProcessedAtUtc = DateTime.UtcNow;
                webhook.UpdatedAtUtc = DateTime.UtcNow;

                await dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return new PaymentWebhookProcessResponse(
                    PaymentWebhookOutcome.InvalidSignature,
                    null);
            }

            if (providerReference is null)
            {
                webhook.Status = PaymentWebhookEventStatus.Ignored;
                webhook.ErrorMessage = "El webhook no contiene una referencia de pago.";
                webhook.ProcessedAtUtc = DateTime.UtcNow;
                webhook.UpdatedAtUtc = DateTime.UtcNow;

                await dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return new PaymentWebhookProcessResponse(
                    PaymentWebhookOutcome.Ignored,
                    null);
            }

            var intent = await dbContext.PaymentIntents
                .Include(item => item.Reservation)
                .Include(item => item.Payment)
                .SingleOrDefaultAsync(
                    item =>
                        !item.IsDeleted &&
                        item.Provider == canonicalProvider &&
                        item.ProviderReference == providerReference,
                    cancellationToken);

            if (intent is null)
            {
                webhook.Status = PaymentWebhookEventStatus.Ignored;
                webhook.ErrorMessage = "No existe un intento asociado a la referencia recibida.";
                webhook.ProcessedAtUtc = DateTime.UtcNow;
                webhook.UpdatedAtUtc = DateTime.UtcNow;

                await dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return new PaymentWebhookProcessResponse(
                    PaymentWebhookOutcome.Ignored,
                    null);
            }

            webhook.PaymentIntentId = intent.Id;
            webhook.PaymentIntent = intent;

            var applied = ApplyWebhookStatus(intent, gatewayResult);

            webhook.Status = applied
                ? PaymentWebhookEventStatus.Processed
                : PaymentWebhookEventStatus.Ignored;
            webhook.ProcessedAtUtc = DateTime.UtcNow;
            webhook.UpdatedAtUtc = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new PaymentWebhookProcessResponse(
                applied ? PaymentWebhookOutcome.Processed : PaymentWebhookOutcome.Ignored,
                intent.Id);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            dbContext.ChangeTracker.Clear();

            var duplicate = await dbContext.PaymentWebhookEvents
                .AsNoTracking()
                .Where(item =>
                    item.Provider == canonicalProvider &&
                    item.EventId == eventId)
                .Select(item => new { item.PaymentIntentId })
                .SingleOrDefaultAsync(cancellationToken);

            if (duplicate is not null)
            {
                return new PaymentWebhookProcessResponse(
                    PaymentWebhookOutcome.Duplicate,
                    duplicate.PaymentIntentId);
            }

            throw;
        }
    }

    private async Task<PaymentIntentResponse> InitializeGatewayIntentAsync(
        PaymentIntent intent,
        Reservation reservation,
        IPaymentGateway gateway,
        CancellationToken cancellationToken)
    {
        PaymentGatewayCreateResult gatewayResult;

        try
        {
            gatewayResult = await gateway.CreateIntentAsync(
                new PaymentGatewayCreateCommand(
                    intent.Id,
                    reservation.Id,
                    intent.Amount,
                    intent.Currency,
                    intent.IdempotencyKey,
                    $"Reserva Edificios Oliva {reservation.Id:N}"),
                cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "No se pudo confirmar la creación del intento {PaymentIntentId} con {Provider}.",
                intent.Id,
                intent.Provider);

            await MarkGatewayOutcomeUnknownAsync(
                intent,
                "gateway_create_transport_error",
                exception.Message,
                cancellationToken);

            throw new InvalidOperationException(
                "No fue posible confirmar el estado del pago. Reintenta con la misma clave de idempotencia.");
        }

        if (string.IsNullOrWhiteSpace(gatewayResult.ProviderReference))
        {
            await MarkGatewayOutcomeUnknownAsync(
                intent,
                "gateway_reference_missing",
                "El proveedor no devolvió una referencia de pago.",
                cancellationToken);

            throw new InvalidOperationException(
                "El proveedor de pagos no devolvió una referencia válida. Reintenta con la misma clave de idempotencia.");
        }

        if (gatewayResult.Status == PaymentIntentStatus.Refunded)
        {
            await MarkGatewayOutcomeUnknownAsync(
                intent,
                "gateway_invalid_initial_status",
                "El proveedor devolvió Refunded al crear el intento.",
                cancellationToken);

            throw new InvalidOperationException(
                "El proveedor devolvió un estado inválido al crear el intento de pago.");
        }

        intent.ProviderReference = TrimTo(gatewayResult.ProviderReference, 200);
        intent.CheckoutUrl = TrimToOptional(gatewayResult.CheckoutUrl, 1000);
        intent.ExpiresAtUtc = gatewayResult.ExpiresAtUtc ?? intent.ExpiresAtUtc;
        intent.FailureCode = TrimToOptional(gatewayResult.FailureCode, 100);
        intent.FailureMessage = TrimToOptional(gatewayResult.FailureMessage, 500);
        intent.Status = gatewayResult.Status;
        intent.UpdatedAtUtc = DateTime.UtcNow;
        ApplyStatusTimestamps(intent, gatewayResult.Status);

        if (gatewayResult.Status == PaymentIntentStatus.Succeeded)
        {
            FinalizeSucceededIntent(intent, reservation);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return MapResponse(intent);
    }

    private async Task MarkGatewayOutcomeUnknownAsync(
        PaymentIntent intent,
        string failureCode,
        string failureMessage,
        CancellationToken cancellationToken)
    {
        intent.Status = PaymentIntentStatus.Processing;
        intent.FailureCode = TrimTo(failureCode, 100);
        intent.FailureMessage = TrimTo(failureMessage, 500);
        intent.UpdatedAtUtc = DateTime.UtcNow;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception persistenceException) when (persistenceException is not OperationCanceledException)
        {
            logger.LogError(
                persistenceException,
                "No se pudo persistir el estado incierto del intento {PaymentIntentId}.",
                intent.Id);
        }
    }

    private bool ApplyWebhookStatus(
        PaymentIntent intent,
        PaymentGatewayWebhookResult gatewayResult)
    {
        if (intent.Status == PaymentIntentStatus.Refunded)
        {
            return false;
        }

        if (intent.Status == PaymentIntentStatus.Succeeded &&
            gatewayResult.Status is not PaymentIntentStatus.Succeeded and
            not PaymentIntentStatus.Refunded)
        {
            return false;
        }

        intent.UpdatedAtUtc = DateTime.UtcNow;
        intent.FailureCode = TrimToOptional(gatewayResult.FailureCode, 100);
        intent.FailureMessage = TrimToOptional(gatewayResult.FailureMessage, 500);

        switch (gatewayResult.Status)
        {
            case PaymentIntentStatus.Succeeded:
                intent.Status = PaymentIntentStatus.Succeeded;
                intent.FailureCode = null;
                intent.FailureMessage = null;
                ApplyStatusTimestamps(intent, PaymentIntentStatus.Succeeded);
                FinalizeSucceededIntent(intent, intent.Reservation);
                return true;

            case PaymentIntentStatus.Refunded:
                intent.Status = PaymentIntentStatus.Refunded;
                ApplyStatusTimestamps(intent, PaymentIntentStatus.Refunded);

                if (intent.Payment is not null && intent.Payment.Status == PaymentStatus.Paid)
                {
                    intent.Payment.Status = PaymentStatus.Refunded;
                    intent.Payment.RefundedAtUtc = DateTime.UtcNow;
                    intent.Payment.UpdatedAtUtc = DateTime.UtcNow;
                }

                return true;

            case PaymentIntentStatus.Failed:
            case PaymentIntentStatus.Cancelled:
            case PaymentIntentStatus.Processing:
            case PaymentIntentStatus.RequiresAction:
            case PaymentIntentStatus.Created:
                intent.Status = gatewayResult.Status;
                ApplyStatusTimestamps(intent, gatewayResult.Status);
                return true;

            default:
                return false;
        }
    }

    private void FinalizeSucceededIntent(
        PaymentIntent intent,
        Reservation reservation)
    {
        if (!intent.PaymentId.HasValue)
        {
            var payment = new Payment
            {
                ReservationId = reservation.Id,
                Reservation = reservation,
                Amount = intent.Amount,
                Method = intent.Method,
                Status = PaymentStatus.Paid,
                TransactionId = $"online:{intent.Id:N}",
                Notes = $"Pago online confirmado por {intent.Provider}.",
                PaidAtUtc = DateTime.UtcNow,
            };

            dbContext.Payments.Add(payment);
            intent.PaymentId = payment.Id;
            intent.Payment = payment;
        }

        if (reservation.Status == ReservationStatus.Pending)
        {
            reservation.Status = ReservationStatus.Confirmed;
            reservation.UpdatedAtUtc = DateTime.UtcNow;
        }
    }

    private async Task<PaymentIntent?> FindByIdempotencyKeyAsync(
        string idempotencyKey,
        CancellationToken cancellationToken)
    {
        return await dbContext.PaymentIntents
            .Include(intent => intent.Reservation)
                .ThenInclude(reservation => reservation.Customer)
            .Include(intent => intent.Reservation)
                .ThenInclude(reservation => reservation.Apartment)
            .SingleOrDefaultAsync(
                intent => !intent.IsDeleted && intent.IdempotencyKey == idempotencyKey,
                cancellationToken);
    }

    private IPaymentGateway GetGateway(string provider)
    {
        var gateway = gateways.FirstOrDefault(item =>
            string.Equals(
                CanonicalizeProvider(item.Provider),
                provider,
                StringComparison.OrdinalIgnoreCase));

        return gateway ?? throw new KeyNotFoundException(
            $"El proveedor de pagos '{provider}' no está configurado.");
    }

    private static bool CanResumeGatewayCreation(PaymentIntent intent)
    {
        return intent.ProviderReference is null &&
               intent.Status is PaymentIntentStatus.Created or PaymentIntentStatus.Processing;
    }

    private static void EnsureIdempotencyScope(
        PaymentIntent existing,
        Guid reservationId,
        string provider)
    {
        if (existing.ReservationId != reservationId ||
            !string.Equals(existing.Provider, provider, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "La clave de idempotencia ya fue utilizada para otra operación.");
        }
    }

    private static void ApplyStatusTimestamps(
        PaymentIntent intent,
        PaymentIntentStatus status)
    {
        var now = DateTime.UtcNow;

        switch (status)
        {
            case PaymentIntentStatus.Succeeded:
                intent.SucceededAtUtc ??= now;
                intent.FailedAtUtc = null;
                intent.CancelledAtUtc = null;
                break;

            case PaymentIntentStatus.Failed:
                intent.FailedAtUtc ??= now;
                break;

            case PaymentIntentStatus.Cancelled:
                intent.CancelledAtUtc ??= now;
                break;

            case PaymentIntentStatus.Refunded:
                intent.RefundedAtUtc ??= now;
                break;
        }
    }

    private static string CanonicalizeProvider(string provider)
    {
        if (string.IsNullOrWhiteSpace(provider))
        {
            throw new ArgumentException("Debes indicar un proveedor de pagos.");
        }

        return TrimTo(provider.Trim().ToUpperInvariant(), 50);
    }

    private static string TrimTo(string value, int maxLength)
    {
        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static string? TrimToOptional(string? value, int maxLength)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : TrimTo(value, maxLength);
    }

    private static PaymentIntentResponse MapResponse(PaymentIntent intent)
    {
        return new PaymentIntentResponse(
            intent.Id,
            intent.ReservationId,
            intent.Reservation.Customer.Name,
            intent.Reservation.Apartment.Name,
            intent.Reservation.TotalAmount,
            intent.Amount,
            intent.Currency,
            intent.Provider,
            intent.Method,
            intent.Status,
            intent.IdempotencyKey,
            intent.ProviderReference,
            intent.CheckoutUrl,
            intent.PaymentId,
            intent.FailureCode,
            intent.FailureMessage,
            intent.ExpiresAtUtc,
            intent.SucceededAtUtc,
            intent.FailedAtUtc,
            intent.CancelledAtUtc,
            intent.RefundedAtUtc,
            intent.CreatedAtUtc,
            intent.UpdatedAtUtc);
    }
}
