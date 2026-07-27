import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { Booking } from '../../../core/models/booking.model';
import { Payment } from '../../../core/models/payment.model';
import { Payments as PaymentsService, PaymentRequest } from '../../../core/services/payments';
import { Reservations } from '../../../core/services/reservations';

interface PaymentForm {
  reservationId: string;
  amount: number;
  method: number;
  status: number;
  transactionId: string;
  notes: string;
}

@Component({
  selector: 'app-payments',
  imports: [FormsModule],
  templateUrl: './payments.html',
  styleUrl: './payments.css',
})
export class Payments implements OnInit {
  private readonly paymentsService = inject(PaymentsService);
  private readonly reservationsService = inject(Reservations);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);

  payments: Payment[] = [];
  reservations: Booking[] = [];

  loading = true;
  saving = false;
  showForm = false;
  editingId: string | null = null;

  search = '';
  statusFilter = 0;
  methodFilter = 0;
  successMessage = '';
  errorMessage = '';

  paymentForm: PaymentForm = this.getEmptyForm();

  ngOnInit(): void {
    this.loadReservations();
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading = true;
    this.errorMessage = '';
    this.changeDetector.markForCheck();

    this.paymentsService
      .getAll({
        page: 1,
        pageSize: 100,
        search: this.search,
        status: this.statusFilter || undefined,
        method: this.methodFilter || undefined,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (result) => {
          this.payments = result.items;
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          this.payments = [];
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible cargar los pagos.';
          this.changeDetector.markForCheck();
        },
      });
  }

  openCreateForm(): void {
    this.editingId = null;
    this.paymentForm = this.getEmptyForm();
    this.clearMessages();
    this.showForm = true;
  }

  openEditForm(payment: Payment): void {
    this.editingId = payment.id;
    this.paymentForm = {
      reservationId: payment.reservationId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      transactionId: payment.transactionId ?? '',
      notes: payment.notes ?? '',
    };
    this.clearMessages();
    this.showForm = true;
  }

  closeForm(): void {
    if (this.saving) return;
    this.showForm = false;
    this.editingId = null;
    this.paymentForm = this.getEmptyForm();
  }

  onReservationChange(): void {
    const reservation = this.reservations.find(
      (item) => item.id === this.paymentForm.reservationId,
    );

    if (reservation) {
      this.paymentForm.amount = reservation.totalAmount;
    }
  }

  savePayment(): void {
    this.clearMessages();

    if (!this.paymentForm.reservationId) {
      this.errorMessage = 'Selecciona una reserva.';
      return;
    }

    if (Number(this.paymentForm.amount) <= 0) {
      this.errorMessage = 'El monto debe ser mayor que cero.';
      return;
    }

    const request: PaymentRequest = {
      reservationId: this.paymentForm.reservationId,
      amount: Number(this.paymentForm.amount),
      method: Number(this.paymentForm.method),
      status: Number(this.paymentForm.status),
      transactionId: this.paymentForm.transactionId.trim() || null,
      notes: this.paymentForm.notes.trim() || null,
    };

    this.saving = true;
    const operation = this.editingId
      ? this.paymentsService.update(this.editingId, request)
      : this.paymentsService.create(request);

    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = this.editingId
            ? 'Pago actualizado correctamente.'
            : 'Pago registrado correctamente.';
          this.showForm = false;
          this.editingId = null;
          this.paymentForm = this.getEmptyForm();
          this.loadPayments();
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible guardar el pago.';
          this.changeDetector.markForCheck();
        },
      });
  }

  refundPayment(payment: Payment): void {
    if (!confirm(`¿Deseas reembolsar el pago de "${payment.customerName}"?`)) {
      return;
    }

    this.clearMessages();
    this.paymentsService
      .refund(payment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage = 'Pago reembolsado correctamente.';
          this.loadPayments();
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible reembolsar el pago.';
          this.changeDetector.markForCheck();
        },
      });
  }

  deletePayment(payment: Payment): void {
    if (!confirm(`¿Deseas eliminar el pago de "${payment.customerName}"?`)) {
      return;
    }

    this.clearMessages();
    this.paymentsService
      .delete(payment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage = 'Pago eliminado correctamente.';
          this.loadPayments();
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible eliminar el pago.';
          this.changeDetector.markForCheck();
        },
      });
  }

  statusLabel(status: number): string {
    switch (status) {
      case 2:
        return 'Pagado';
      case 3:
        return 'Reembolsado';
      case 4:
        return 'Fallido';
      case 1:
      default:
        return 'Pendiente';
    }
  }

  methodLabel(method: number): string {
    switch (method) {
      case 2:
        return 'Transferencia';
      case 3:
        return 'PayPal';
      case 4:
        return 'Tarjeta';
      case 1:
      default:
        return 'Efectivo';
    }
  }

  shortId(id: string): string {
    return id.slice(0, 8);
  }

  private loadReservations(): void {
    this.reservationsService
      .getAll({ page: 1, pageSize: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.reservations = result.items.filter((reservation) => reservation.status !== 5);
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar las reservas disponibles.';
          this.changeDetector.markForCheck();
        },
      });
  }

  private getEmptyForm(): PaymentForm {
    return {
      reservationId: '',
      amount: 0,
      method: 1,
      status: 1,
      transactionId: '',
      notes: '',
    };
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
