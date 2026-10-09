namespace EdificiosOliva.Domain.Enums;

public enum PaymentIntentStatus
{
    Created = 1,
    Processing = 2,
    RequiresAction = 3,
    Succeeded = 4,
    Failed = 5,
    Cancelled = 6,
    Refunded = 7
}
