using EdificiosOliva.Application.DTOs.Notifications;

namespace EdificiosOliva.Application.Interfaces;

public interface IBookingNotificationService
{
    Task SendBookingCreatedAsync(
        BookingCreatedNotification notification,
        CancellationToken cancellationToken = default);

    Task SendPaymentConfirmedAsync(
        PaymentConfirmedNotification notification,
        CancellationToken cancellationToken = default);
}
