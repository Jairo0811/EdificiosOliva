import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';

import { Apartment } from '../../../core/models/apartment.model';
import { Booking } from '../../../core/models/booking.model';
import { Customer } from '../../../core/models/customer.model';
import { Apartments } from '../../../core/services/apartments';
import { Customers } from '../../../core/services/customers';
import {
  ReservationRequest,
  Reservations,
} from '../../../core/services/reservations';

interface ReservationForm {
  customerId: string;
  apartmentId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  status: number;
  notes: string;
}

@Component({
  selector: 'app-bookings-admin',
  imports: [FormsModule],
  templateUrl: './bookings-admin.html',
  styleUrl: './bookings-admin.css',
})
export class BookingsAdmin implements OnInit {
  private readonly reservationsService = inject(Reservations);
  private readonly customersService = inject(Customers);
  private readonly apartmentsService = inject(Apartments);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);

  bookings: Booking[] = [];
  customers: Customer[] = [];
  apartments: Apartment[] = [];

  loading = true;
  saving = false;
  showForm = false;
  editingId: string | null = null;

  search = '';
  statusFilter = 0;
  successMessage = '';
  errorMessage = '';

  reservationForm: ReservationForm = this.getEmptyForm();

  ngOnInit(): void {
    this.loadReferenceData();
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading = true;
    this.errorMessage = '';
    this.changeDetector.markForCheck();

    this.reservationsService
      .getAll({
        page: 1,
        pageSize: 100,
        search: this.search,
        status: this.statusFilter || undefined,
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
          this.bookings = result.items;
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          this.bookings = [];
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible cargar las reservas.';
          this.changeDetector.markForCheck();
        },
      });
  }

  openCreateForm(): void {
    this.editingId = null;
    this.reservationForm = this.getEmptyForm();
    this.clearMessages();
    this.showForm = true;
  }

  openEditForm(booking: Booking): void {
    this.editingId = booking.id;
    this.reservationForm = {
      customerId: booking.customerId,
      apartmentId: booking.apartmentId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      guestCount: booking.guestCount,
      status: booking.status,
      notes: booking.notes ?? '',
    };
    this.clearMessages();
    this.showForm = true;
  }

  closeForm(): void {
    if (this.saving) return;
    this.showForm = false;
    this.editingId = null;
    this.reservationForm = this.getEmptyForm();
  }

  saveReservation(): void {
    this.clearMessages();

    if (
      !this.reservationForm.customerId ||
      !this.reservationForm.apartmentId ||
      !this.reservationForm.checkInDate ||
      !this.reservationForm.checkOutDate
    ) {
      this.errorMessage = 'Completa cliente, apartamento y fechas.';
      return;
    }

    if (this.reservationForm.checkOutDate <= this.reservationForm.checkInDate) {
      this.errorMessage = 'La fecha de salida debe ser posterior a la entrada.';
      return;
    }

    const request: ReservationRequest = {
      customerId: this.reservationForm.customerId,
      apartmentId: this.reservationForm.apartmentId,
      checkInDate: this.reservationForm.checkInDate,
      checkOutDate: this.reservationForm.checkOutDate,
      guestCount: Math.max(1, Number(this.reservationForm.guestCount) || 1),
      status: Number(this.reservationForm.status),
      notes: this.reservationForm.notes.trim() || null,
    };

    this.saving = true;
    const operation = this.editingId
      ? this.reservationsService.update(this.editingId, request)
      : this.reservationsService.create(request);

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
            ? 'Reserva actualizada correctamente.'
            : 'Reserva creada correctamente.';
          this.showForm = false;
          this.editingId = null;
          this.reservationForm = this.getEmptyForm();
          this.loadBookings();
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible guardar la reserva.';
          this.changeDetector.markForCheck();
        },
      });
  }

  deleteReservation(booking: Booking): void {
    if (!confirm(`¿Deseas eliminar la reserva de "${booking.customerName}"?`)) {
      return;
    }

    this.clearMessages();
    this.reservationsService
      .delete(booking.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage = 'Reserva eliminada correctamente.';
          this.loadBookings();
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible eliminar la reserva.';
          this.changeDetector.markForCheck();
        },
      });
  }

  statusLabel(status: number): string {
    switch (status) {
      case 2:
        return 'Confirmada';
      case 3:
        return 'En curso';
      case 4:
        return 'Completada';
      case 5:
        return 'Cancelada';
      case 1:
      default:
        return 'Pendiente';
    }
  }

  shortId(id: string): string {
    return id.slice(0, 8);
  }

  calculateNights(): number {
    const { checkInDate, checkOutDate } = this.reservationForm;
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(`${checkInDate}T00:00:00`);
    const end = new Date(`${checkOutDate}T00:00:00`);
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  }

  estimatedTotal(): number {
    const apartment = this.apartments.find(
      (item) => item.id === this.reservationForm.apartmentId,
    );
    return apartment ? apartment.price * this.calculateNights() : 0;
  }

  private loadReferenceData(): void {
    forkJoin({
      customers: this.customersService.getAll('', 'Activo'),
      apartments: this.apartmentsService.getApartments(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ customers, apartments }) => {
          this.customers = customers;
          this.apartments = apartments.filter(
            (apartment) => apartment.status !== 'Mantenimiento',
          );
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.errorMessage = 'No fue posible cargar clientes o apartamentos.';
          this.changeDetector.markForCheck();
        },
      });
  }

  private getEmptyForm(): ReservationForm {
    return {
      customerId: '',
      apartmentId: '',
      checkInDate: '',
      checkOutDate: '',
      guestCount: 1,
      status: 1,
      notes: '',
    };
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
