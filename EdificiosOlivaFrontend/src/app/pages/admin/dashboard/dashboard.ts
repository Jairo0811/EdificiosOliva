import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  DashboardReservationItem,
  DashboardService,
  DashboardSummary,
} from '../../../core/services/dashboard';

interface DashboardStat {
  title: string;
  value: string | number;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);

  loading = true;
  errorMessage = '';
  summary: DashboardSummary | null = null;
  stats: DashboardStat[] = [];

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';
    this.changeDetector.markForCheck();

    this.dashboardService
      .getSummary()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (summary) => {
          this.summary = summary;
          this.stats = [
            {
              title: 'Apartamentos',
              value: summary.totalApartments,
              icon: 'bi-building',
            },
            {
              title: 'Reservas',
              value: summary.totalReservations,
              icon: 'bi-calendar-check',
            },
            {
              title: 'Clientes activos',
              value: summary.activeCustomers,
              icon: 'bi-people-fill',
            },
            {
              title: 'Ingresos',
              value: this.formatCurrency(summary.totalRevenue),
              icon: 'bi-cash-stack',
            },
          ];
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          this.summary = null;
          this.stats = [];
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible cargar el dashboard.';
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

  statusClass(status: number): string {
    switch (status) {
      case 2:
        return 'confirmed';
      case 3:
        return 'in-progress';
      case 4:
        return 'completed';
      case 5:
        return 'cancelled';
      case 1:
      default:
        return 'pending';
    }
  }

  nextCheckInLabel(): string {
    const date = this.summary?.nextCheckInDate;
    if (!date) return 'Sin próximos check-in';

    const today = new Date();
    const target = new Date(`${date}T00:00:00`);
    const difference = Math.round(
      (target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000,
    );

    if (difference === 0) return 'Hoy';
    if (difference === 1) return 'Mañana';

    return new Intl.DateTimeFormat('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
  }

  trackReservation(_: number, reservation: DashboardReservationItem): string {
    return reservation.id;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }
}
