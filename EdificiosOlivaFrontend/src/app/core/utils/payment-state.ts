import { PublicPaymentState } from '../services/public-payments';

export interface PaymentStateView {
  tone: 'success' | 'info' | 'warning' | 'danger';
  icon: string;
  title: string;
  message: string;
  /** true when starting a new online payment is safe (no payment in flight or settled). */
  canRetryPayment: boolean;
}

/**
 * Texts for each backend-reported payment state. Only `Confirmed` may be
 * presented as a confirmed reservation.
 */
export function describePaymentState(state: PublicPaymentState): PaymentStateView {
  switch (state) {
    case PublicPaymentState.Confirmed:
      return {
        tone: 'success',
        icon: 'bi-check-circle-fill',
        title: 'Pago confirmado',
        message:
          'Tu pago fue verificado y la reserva está confirmada. Te enviamos los detalles por correo.',
        canRetryPayment: false,
      };
    case PublicPaymentState.Pending:
      return {
        tone: 'info',
        icon: 'bi-hourglass-split',
        title: 'Verificando tu pago',
        message:
          'Todavía no tenemos la confirmación de AZUL. La reserva sigue pendiente; no vuelvas a pagar. Puedes verificar de nuevo en unos minutos.',
        canRetryPayment: false,
      };
    case PublicPaymentState.Declined:
      return {
        tone: 'danger',
        icon: 'bi-x-circle-fill',
        title: 'Pago rechazado',
        message:
          'AZUL no aprobó el pago y no se registró ningún cobro. Puedes intentarlo de nuevo.',
        canRetryPayment: true,
      };
    case PublicPaymentState.Cancelled:
      return {
        tone: 'warning',
        icon: 'bi-info-circle-fill',
        title: 'Pago cancelado',
        message:
          'El proceso de pago fue cancelado y no se registró ningún cobro. La reserva sigue pendiente.',
        canRetryPayment: true,
      };
    case PublicPaymentState.Refunded:
      return {
        tone: 'info',
        icon: 'bi-arrow-counterclockwise',
        title: 'Pago reembolsado',
        message: 'El pago de esta reserva fue reembolsado.',
        canRetryPayment: false,
      };
    case PublicPaymentState.RequiresReview:
      return {
        tone: 'warning',
        icon: 'bi-exclamation-triangle-fill',
        title: 'Estado en revisión',
        message:
          'No podemos confirmar automáticamente el estado de este pago. No vuelvas a pagar: contacta a Edificios Oliva con tu código de reserva para que lo revisemos.',
        canRetryPayment: false,
      };
    case PublicPaymentState.NotStarted:
    default:
      return {
        tone: 'info',
        icon: 'bi-info-circle-fill',
        title: 'Pago no iniciado',
        message:
          'No hay ningún pago registrado para esta reserva. Puedes pagar en línea o coordinar con nosotros.',
        canRetryPayment: true,
      };
  }
}
