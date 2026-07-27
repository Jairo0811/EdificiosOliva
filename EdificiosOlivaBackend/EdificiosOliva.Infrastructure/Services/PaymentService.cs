using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Enums;
using EdificiosOliva.Domain.Interfaces;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Services;

public sealed class PaymentService(
    IPaymentRepository paymentRepository,
    ApplicationDbContext dbContext) : IPaymentService
{
    public async Task<PagedResult<PaymentResponse>> GetPagedAsync(
        PaymentQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var query = paymentRepository.Query()
            .AsNoTracking()
            .Include(payment => payment.Reservation)
                .ThenInclude(reservation => reservation.Customer)
            .Include(payment => payment.Reservation)
                .ThenInclude(reservation => reservation.Apartment)
            .Where(payment => !payment.IsDeleted);

        if (!string.IsNullOrWhiteSpace(parameters.Search))
        {
            var search = parameters.Search.Trim();
            query = query.Where(payment =>
                payment.Reservation.Customer.Name.Contains(search) ||
                payment.Reservation.Customer.Email.Contains(search) ||
                payment.Reservation.Apartment.Name.Contains(search) ||
                (payment.TransactionId != null && payment.TransactionId.Contains(search)));
        }

        if (parameters.Status.HasValue)
        {
            query = query.Where(payment => payment.Status == parameters.Status.Value);
        }

        if (parameters.Method.HasValue)
        {
            query = query.Where(payment => payment.Method == parameters.Method.Value);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(payment => payment.CreatedAtUtc)
            .Skip((parameters.Page - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(payment => MapResponse(payment))
            .ToListAsync(cancellationToken);

        return new PagedResult<PaymentResponse>(
            items,
            parameters.Page,
            parameters.PageSize,
            totalItems);
    }

    public async Task<PaymentResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var payment = await paymentRepository.GetByIdAsync(id, cancellationToken);
        return payment is null ? null : MapResponse(payment);
    }

    public async Task<PaymentResponse> CreateAsync(
        CreatePaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var reservation = await ValidateRequestAsync(request, null, cancellationToken);

        var payment = new Payment
        {
            ReservationId = reservation.Id,
            Amount = request.Amount,
            Method = request.Method,
            Status = request.Status,
            TransactionId = NormalizeOptional(request.TransactionId),
            Notes = NormalizeOptional(request.Notes),
            PaidAtUtc = request.Status == PaymentStatus.Paid ? DateTime.UtcNow : null,
            RefundedAtUtc = request.Status == PaymentStatus.Refunded ? DateTime.UtcNow : null,
        };

        await paymentRepository.AddAsync(payment, cancellationToken);
        await paymentRepository.SaveChangesAsync(cancellationToken);

        payment.Reservation = reservation;
        return MapResponse(payment);
    }

    public async Task<bool> UpdateAsync(
        Guid id,
        UpdatePaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var payment = await paymentRepository.GetByIdAsync(id, cancellationToken);
        if (payment is null)
        {
            return false;
        }

        var reservation = await ValidateRequestAsync(request, id, cancellationToken);

        payment.ReservationId = reservation.Id;
        payment.Amount = request.Amount;
        payment.Method = request.Method;
        payment.TransactionId = NormalizeOptional(request.TransactionId);
        payment.Notes = NormalizeOptional(request.Notes);
        payment.Status = request.Status;
        payment.PaidAtUtc = request.Status == PaymentStatus.Paid
            ? payment.PaidAtUtc ?? DateTime.UtcNow
            : null;
        payment.RefundedAtUtc = request.Status == PaymentStatus.Refunded
            ? payment.RefundedAtUtc ?? DateTime.UtcNow
            : null;
        payment.UpdatedAtUtc = DateTime.UtcNow;

        await paymentRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RefundAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var payment = await paymentRepository.GetByIdAsync(id, cancellationToken);
        if (payment is null)
        {
            return false;
        }

        if (payment.Status != PaymentStatus.Paid)
        {
            throw new InvalidOperationException("Solo se pueden reembolsar pagos completados.");
        }

        payment.Status = PaymentStatus.Refunded;
        payment.RefundedAtUtc = DateTime.UtcNow;
        payment.UpdatedAtUtc = DateTime.UtcNow;

        await paymentRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var payment = await paymentRepository.GetByIdAsync(id, cancellationToken);
        if (payment is null)
        {
            return false;
        }

        payment.IsDeleted = true;
        payment.UpdatedAtUtc = DateTime.UtcNow;
        await paymentRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<Reservation> ValidateRequestAsync(
        PaymentRequest request,
        Guid? paymentId,
        CancellationToken cancellationToken)
    {
        var reservation = await dbContext.Reservations
            .Include(item => item.Customer)
            .Include(item => item.Apartment)
            .SingleOrDefaultAsync(
                item => item.Id == request.ReservationId && !item.IsDeleted,
                cancellationToken)
            ?? throw new InvalidOperationException("La reserva indicada no existe.");

        if (reservation.Status == ReservationStatus.Cancelled)
        {
            throw new InvalidOperationException("No se pueden registrar pagos para una reserva cancelada.");
        }

        if (request.Amount > reservation.TotalAmount)
        {
            throw new InvalidOperationException("El monto del pago no puede superar el total de la reserva.");
        }

        var paidAmount = await dbContext.Payments
            .Where(payment =>
                !payment.IsDeleted &&
                payment.Id != paymentId &&
                payment.ReservationId == request.ReservationId &&
                payment.Status == PaymentStatus.Paid)
            .SumAsync(payment => (decimal?)payment.Amount, cancellationToken) ?? 0m;

        if (request.Status == PaymentStatus.Paid && paidAmount + request.Amount > reservation.TotalAmount)
        {
            throw new InvalidOperationException("Los pagos completados excederían el total de la reserva.");
        }

        var transactionId = NormalizeOptional(request.TransactionId);
        if (transactionId is not null)
        {
            var duplicated = await dbContext.Payments.AnyAsync(
                payment =>
                    !payment.IsDeleted &&
                    payment.Id != paymentId &&
                    payment.TransactionId == transactionId,
                cancellationToken);

            if (duplicated)
            {
                throw new InvalidOperationException("Ya existe un pago con ese identificador de transacción.");
            }
        }

        return reservation;
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static PaymentResponse MapResponse(Payment payment)
    {
        return new PaymentResponse(
            payment.Id,
            payment.ReservationId,
            payment.Reservation.Customer.Name,
            payment.Reservation.Apartment.Name,
            payment.Reservation.TotalAmount,
            payment.Amount,
            payment.Method,
            payment.Status,
            payment.TransactionId,
            payment.Notes,
            payment.PaidAtUtc,
            payment.RefundedAtUtc,
            payment.CreatedAtUtc,
            payment.UpdatedAtUtc);
    }
}
