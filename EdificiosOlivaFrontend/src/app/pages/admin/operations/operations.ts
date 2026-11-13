import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ApartmentPerformanceItem,
  OperationsAnalytics,
  OperationsReservationItem,
  OperationsService,
} from '../../../core/services/operations';
import { repaint } from '../../../core/utils/repaint';
import { todayInPropertyZone } from '../../../core/utils/property-date';

@Component({
  selector: 'app-operations',
  imports: [CommonModule, FormsModule],
  templateUrl: './operations.html',
  styleUrl: './operations.css',
})
export class Operations implements OnInit {
  private readonly operationsService = inject(OperationsService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  downloading = false;
  errorMessage = '';
  copyMessage = '';
  analytics: OperationsAnalytics | null = null;

  fromDate = '';
  toDate = '';
  apartmentFilter = '';
  reservationStatusFilter = 0;

  /** List filters never change the backend-calculated period-wide KPIs. */
  get visibleApartments(): ApartmentPerformanceItem[] {
    return (this.analytics?.apartments ?? []).filter(
      (apartment) => !this.apartmentFilter || apartment.apartmentId === this.apartmentFilter,
    );
  }

  get visibleReservations(): OperationsReservationItem[] {
    return (this.analytics?.reservations ?? []).filter(
      (reservation) =>
        (!this.apartmentFilter || reservation.apartmentId === this.apartmentFilter) &&
        (!this.reservationStatusFilter || reservation.status === this.reservationStatusFilter),
    );
  }

  ngOnInit(): void {
    const today = todayInPropertyZone();
    const [year, month] = today.split('-').map(Number);
    this.fromDate = `${today.slice(0, 7)}-01`;
    this.toDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    this.load();
  }

  load(): void {
    this.errorMessage = '';

    if (!this.fromDate || !this.toDate || this.toDate < this.fromDate) {
      this.errorMessage = 'Selecciona un rango de fechas válido.';
      return;
    }

    this.loading = true;
    this.operationsService
      .getAnalytics(this.fromDate, this.toDate)
      .pipe(repaint(this.cdr))
      .subscribe({
      next: (analytics) => {
        this.analytics = analytics;
        if (this.apartmentFilter && !analytics.apartments.some(
          (apartment) => apartment.apartmentId === this.apartmentFilter,
        )) {
          this.apartmentFilter = '';
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.detail ||
          error?.error?.title ||
          'No fue posible cargar la información operativa.';
      },
    });
  }

  exportReservations(): void {
    this.download(
      this.operationsService.exportReservations(this.analytics?.fromDate ?? this.fromDate, this.analytics?.toDate ?? this.toDate),
      `reservas-${this.analytics?.fromDate ?? this.fromDate}-${this.analytics?.toDate ?? this.toDate}.csv`,
    );
  }

  exportPayments(): void {
    this.download(
      this.operationsService.exportPayments(this.analytics?.fromDate ?? this.fromDate, this.analytics?.toDate ?? this.toDate),
      `pagos-${this.analytics?.fromDate ?? this.fromDate}-${this.analytics?.toDate ?? this.toDate}.csv`,
    );
  }

  async copyCalendar(apartmentId: string): Promise<void> {
    const relativeUrl = this.operationsService.publicCalendarUrl(apartmentId);
    const absoluteUrl =
      typeof window === 'undefined'
        ? relativeUrl
        : new URL(relativeUrl, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      this.copyMessage = 'Enlace iCal copiado.';
    } catch {
      this.copyMessage = absoluteUrl;
    }

    this.cdr.markForCheck();
  }

  statusLabel(status: number): string {
    return (
      {
        1: 'Pendiente',
        2: 'Confirmada',
        3: 'En curso',
        4: 'Completada',
        5: 'Cancelada',
      }[status] ?? 'Desconocida'
    );
  }

  dateDay(value: string): string {
    return value.slice(8, 10);
  }

  dateMonth(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-DO', { month: 'short' })
      .format(new Date(year, month - 1, day))
      .replace('.', '')
      .toUpperCase();
  }

  reservationNights(reservation: OperationsReservationItem): number {
    const start = Date.parse(`${reservation.checkInDate}T00:00:00Z`);
    const end = Date.parse(`${reservation.checkOutDate}T00:00:00Z`);
    return Math.max(0, Math.round((end - start) / 86400000));
  }

  private download(request: import('rxjs').Observable<Blob>, fileName: string): void {
    this.downloading = true;
    this.errorMessage = '';

    request.pipe(repaint(this.cdr)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
        this.downloading = false;
      },
      error: () => {
        this.downloading = false;
        this.errorMessage = 'No fue posible generar el archivo solicitado.';
      },
    });
  }

}
