import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { DashboardService, DashboardSummary } from '../../../core/services/dashboard';
import { Dashboard } from './dashboard';

const summary: DashboardSummary = {
  totalApartments: 3,
  availableApartments: 2,
  totalReservations: 5,
  reservationsThisMonth: 2,
  activeCustomers: 4,
  totalRevenue: 300,
  currentOccupancyRate: 50,
  nextCheckInDate: null,
  recentReservations: [
    {
      id: 'r1',
      customerName: 'Ana Pérez',
      apartmentName: 'Vista Mar',
      checkInDate: '2026-11-20',
      checkOutDate: '2026-11-22',
      status: 2,
    },
    {
      id: 'r2',
      customerName: 'Luis García',
      apartmentName: 'Jardín',
      checkInDate: '2026-11-25',
      checkOutDate: '2026-11-28',
      status: 1,
    },
  ],
};

describe('Dashboard v1.3', () => {
  let fixture: ComponentFixture<Dashboard>;
  let component: Dashboard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: { getSummary: () => of(summary) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows real summary metrics without changing them when filtering recent reservations', () => {
    expect(component.stats.find((stat) => stat.title === 'Reservas')?.value).toBe(5);
    expect(component.filteredReservations).toHaveLength(2);

    component.reservationStatus = 2;
    expect(component.filteredReservations.map((reservation) => reservation.id)).toEqual(['r1']);
    expect(component.stats.find((stat) => stat.title === 'Reservas')?.value).toBe(5);
  });

  it('filters recent reservations by customer or apartment, ignoring case', () => {
    component.reservationQuery = 'VISTA';
    expect(component.filteredReservations.map((reservation) => reservation.id)).toEqual(['r1']);

    component.reservationQuery = 'luis';
    expect(component.filteredReservations.map((reservation) => reservation.id)).toEqual(['r2']);

    component.reservationStatus = 2;
    expect(component.filteredReservations).toHaveLength(0);
  });

  it('renders mobile reservation cards with accessible field labels', () => {
    const cards = fixture.nativeElement.querySelectorAll('.reservation-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Ana Pérez');
    expect(cards[0].textContent).toContain('Entrada');
  });

  it('shows an empty filter state without hiding the global dashboard', async () => {
    component.reservationQuery = 'No existe';
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No hay coincidencias');
    expect(fixture.nativeElement.textContent).toContain('Clientes activos');
  });
});
