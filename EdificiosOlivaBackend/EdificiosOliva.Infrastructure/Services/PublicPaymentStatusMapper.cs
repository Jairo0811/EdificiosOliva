using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Domain.Enums;

namespace EdificiosOliva.Infrastructure.Services;

/// <summary>
/// Traduce datos persistidos (reserva + último intento de pago) al estado que
/// se muestra al huésped. Es una función pura: no consulta ni modifica nada.
/// Un pago solo se considera <see cref="PublicPaymentState.Confirmed"/> cuando
/// el intento está en <c>Succeeded</c> Y la reserva ya fue confirmada por el backend.
/// </summary>
public static class PublicPaymentStatusMapper
{
    public static PublicPaymentState Resolve(
        ReservationStatus reservationStatus,
        PaymentIntentStatus? intentStatus,
        DateTime? intentExpiresAtUtc,
        DateTime nowUtc)
    {
        if (intentStatus is null)
        {
            return PublicPaymentState.NotStarted;
        }

        switch (intentStatus.Value)
        {
            case PaymentIntentStatus.Succeeded:
                return reservationStatus is
                    ReservationStatus.Confirmed or
                    ReservationStatus.InProgress or
                    ReservationStatus.Completed
                    ? PublicPaymentState.Confirmed
                    : PublicPaymentState.RequiresReview;

            case PaymentIntentStatus.Created:
            case PaymentIntentStatus.Processing:
            case PaymentIntentStatus.RequiresAction:
                // Un intento vencido sin resultado puede recibir una notificación
                // tardía de la pasarela: no se declara fallo, se pide revisión.
                return intentExpiresAtUtc.HasValue && intentExpiresAtUtc.Value <= nowUtc
                    ? PublicPaymentState.RequiresReview
                    : PublicPaymentState.Pending;

            case PaymentIntentStatus.Failed:
                return PublicPaymentState.Declined;

            case PaymentIntentStatus.Cancelled:
                return PublicPaymentState.Cancelled;

            case PaymentIntentStatus.Refunded:
                return PublicPaymentState.Refunded;

            default:
                return PublicPaymentState.RequiresReview;
        }
    }
}
