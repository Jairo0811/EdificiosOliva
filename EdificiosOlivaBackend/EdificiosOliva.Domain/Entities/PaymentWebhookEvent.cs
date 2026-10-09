using EdificiosOliva.Domain.Common;
using EdificiosOliva.Domain.Enums;

namespace EdificiosOliva.Domain.Entities;

public sealed class PaymentWebhookEvent : BaseEntity
{
    public Guid? PaymentIntentId { get; set; }
    public PaymentIntent? PaymentIntent { get; set; }

    public string Provider { get; set; } = string.Empty;
    public string EventId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string? ProviderReference { get; set; }
    public PaymentWebhookEventStatus Status { get; set; } = PaymentWebhookEventStatus.Received;
    public bool SignatureVerified { get; set; }
    public string PayloadHash { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public DateTime? ProcessedAtUtc { get; set; }
}
