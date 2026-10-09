using EdificiosOliva.Domain.Common;
using EdificiosOliva.Domain.Enums;

namespace EdificiosOliva.Domain.Entities;

public sealed class PaymentIntent : BaseEntity
{
    public Guid ReservationId { get; set; }
    public Reservation Reservation { get; set; } = null!;

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string Provider { get; set; } = string.Empty;
    public PaymentMethod Method { get; set; }
    public PaymentIntentStatus Status { get; set; } = PaymentIntentStatus.Created;
    public string IdempotencyKey { get; set; } = string.Empty;
    public string? ProviderReference { get; set; }
    public string? CheckoutUrl { get; set; }

    public Guid? PaymentId { get; set; }
    public Payment? Payment { get; set; }

    public string? FailureCode { get; set; }
    public string? FailureMessage { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime? SucceededAtUtc { get; set; }
    public DateTime? FailedAtUtc { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
    public DateTime? RefundedAtUtc { get; set; }
}
