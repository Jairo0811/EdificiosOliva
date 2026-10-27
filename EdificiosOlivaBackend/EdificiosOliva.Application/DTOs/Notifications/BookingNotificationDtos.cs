namespace EdificiosOliva.Application.DTOs.Notifications;

public sealed record BookingCreatedNotification(
    Guid ReservationId,
    string ConfirmationCode,
    string CustomerName,
    string Email,
    string ApartmentName,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    int Nights,
    decimal TotalAmount,
    string Currency);

public sealed record PaymentConfirmedNotification(
    Guid ReservationId,
    string ConfirmationCode,
    string CustomerName,
    string Email,
    string ApartmentName,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    decimal Amount,
    string Currency,
    string Provider,
    string TransactionReference);
