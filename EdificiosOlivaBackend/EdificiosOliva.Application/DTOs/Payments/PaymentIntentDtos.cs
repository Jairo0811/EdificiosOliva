using System.ComponentModel.DataAnnotations;
using EdificiosOliva.Domain.Enums;

namespace EdificiosOliva.Application.DTOs.Payments;

public sealed record PaymentProviderResponse(
    string Provider,
    PaymentMethod Method);

public sealed record PaymentIntentResponse(
    Guid Id,
    Guid ReservationId,
    string CustomerName,
    string ApartmentName,
    decimal ReservationTotal,
    decimal Amount,
    string Currency,
    string Provider,
    PaymentMethod Method,
    PaymentIntentStatus Status,
    string IdempotencyKey,
    string? ProviderReference,
    string? CheckoutUrl,
    Guid? PaymentId,
    string? FailureCode,
    string? FailureMessage,
    DateTime? ExpiresAtUtc,
    DateTime? SucceededAtUtc,
    DateTime? FailedAtUtc,
    DateTime? CancelledAtUtc,
    DateTime? RefundedAtUtc,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed class PaymentIntentQueryParameters
{
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 20;

    [StringLength(150)]
    public string? Search { get; init; }

    [StringLength(50)]
    public string? Provider { get; init; }

    public PaymentIntentStatus? Status { get; init; }
    public Guid? ReservationId { get; init; }
}

public sealed class CreatePaymentIntentRequest
{
    [Required]
    public Guid ReservationId { get; init; }

    [Required, StringLength(50, MinimumLength = 2)]
    public string Provider { get; init; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 8)]
    public string IdempotencyKey { get; init; } = string.Empty;
}

public sealed class CreatePublicPaymentCheckoutRequest
{
    [Required]
    public Guid ReservationId { get; init; }

    [Required, StringLength(32, MinimumLength = 5)]
    public string ConfirmationCode { get; init; } = string.Empty;

    [Required, EmailAddress, StringLength(200)]
    public string Email { get; init; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 8)]
    public string IdempotencyKey { get; init; } = string.Empty;

    [Required, StringLength(50, MinimumLength = 2)]
    public string Provider { get; init; } = "AZUL";
}

public sealed record PublicPaymentCheckoutResponse(
    Guid PaymentIntentId,
    string Provider,
    PaymentIntentStatus Status,
    decimal Amount,
    string Currency,
    string ActionUrl,
    string? AlternateActionUrl,
    string Method,
    IReadOnlyDictionary<string, string> Fields,
    DateTime? ExpiresAtUtc);

public sealed record PaymentGatewayCreateCommand(
    Guid PaymentIntentId,
    Guid ReservationId,
    decimal Amount,
    string Currency,
    string IdempotencyKey,
    string Description);

public sealed record PaymentGatewayCreateResult(
    string ProviderReference,
    PaymentIntentStatus Status,
    string? CheckoutUrl,
    DateTime? ExpiresAtUtc = null,
    string? FailureCode = null,
    string? FailureMessage = null);

public sealed record PaymentGatewayCheckoutCommand(
    Guid PaymentIntentId,
    Guid ReservationId,
    string ProviderReference,
    decimal Amount,
    string Currency,
    string Description);

public sealed record PaymentGatewayCheckoutResult(
    string ActionUrl,
    string? AlternateActionUrl,
    string Method,
    IReadOnlyDictionary<string, string> Fields);

public sealed record PaymentGatewayWebhookRequest(
    string Payload,
    IReadOnlyDictionary<string, string> Headers);

public sealed record PaymentGatewayWebhookResult(
    string EventId,
    string EventType,
    bool SignatureVerified,
    string? ProviderReference,
    PaymentIntentStatus Status,
    decimal? Amount = null,
    string? FailureCode = null,
    string? FailureMessage = null);

public sealed record PaymentGatewayRefundCommand(
    string ProviderReference,
    decimal Amount,
    string Currency,
    string IdempotencyKey);

public sealed record PaymentGatewayRefundResult(
    bool Succeeded,
    string? ProviderReference = null,
    string? FailureCode = null,
    string? FailureMessage = null);

public enum PaymentWebhookOutcome
{
    Processed = 1,
    Duplicate = 2,
    Ignored = 3,
    InvalidSignature = 4
}

public sealed record PaymentWebhookProcessResponse(
    PaymentWebhookOutcome Outcome,
    Guid? PaymentIntentId);
