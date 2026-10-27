import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  OperationsAnalytics,
  OperationsReservationItem,
  OperationsService,
} from '../../../core/services/operations';

@Component({
  selector: 'app-operations',
  imports: [CommonModule, FormsModule],
  templateUrl: './operations.html',
  styleUrl: './operations.css',
})
export class Operations implements OnInit {
  private readonly operationsService = inject(OperationsService);

  loading = true;
  downloading = false;
  errorMessage = '';
  copyMessage = '';
  analytics: OperationsAnalytics | null = null;

  fromDate = '';
  toDate = '';

  ngOnInit(): void {
    const today = new Date();
    this.fromDate = this.toDateInput(
      new Date(today.getFullYear(), today.getMonth(), 1),
    );
    this.toDate = this.toDateInput(
      new Date(today.getFullYear(), today.getMonth() + 1, 0),
    );
    this.load();
  }

  load(): void {
    this.errorMessage = '';

    if (!this.fromDate || !this.toDate || this.toDate < this.fromDate) {
      this.errorMessage = 'Selecciona un rango de fechas válido.';
      return;
    }

    this.loading = true;
    this.operationsService.getAnalytics(this.fromDate, this.toDate).subscribe({
      next: (analytics) => {
        this.analytics = analytics;
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
      this.operationsService.exportReservations(this.fromDate, this.toDate),
      `reservas-${this.fromDate}-${this.toDate}.csv`,
    );
  }

  exportPayments(): void {
    this.download(
      this.operationsService.exportPayments(this.fromDate, this.toDate),
      `pagos-${this.fromDate}-${this.toDate}.csv`,
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

  reservationNights(reservation: OperationsReservationItem): number {
    const start = new Date(`${reservation.checkInDate}T00:00:00`);
    const end = new Date(`${reservation.checkOutDate}T00:00:00`);
    return Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 86400000),
    );
  }

  private download(request: import('rxjs').Observable<Blob>, fileName: string): void {
    this.downloading = true;
    this.errorMessage = '';

    request.subscribe({
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

  private toDateInput(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }
}
