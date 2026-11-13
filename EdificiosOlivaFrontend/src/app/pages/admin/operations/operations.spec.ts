import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { OperationsService } from '../../../core/services/operations';
import { Operations } from './operations';

describe('Operations', () => {
  let fixture: ComponentFixture<Operations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Operations],
      providers: [
        {
          provide: OperationsService,
          useValue: {
            getAnalytics: () =>
              of({
                fromDate: '2026-10-01',
                toDate: '2026-10-31',
                totalReservations: 0,
                confirmedReservations: 0,
                cancelledReservations: 0,
                recognizedRevenue: 0,
                bookedNights: 0,
                inventoryNights: 0,
                occupancyRate: 0,
                averageBookedNightlyRate: 0,
                apartments: [],
                reservations: [],
              }),
            exportReservations: () => of(new Blob()),
            exportPayments: () => of(new Blob()),
            publicCalendarUrl: (id: string) => `/api/public/calendars/${id}.ics`,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Operations);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the error message after a failed request without a manual repaint', async () => {
    const service = TestBed.inject(OperationsService);
    const failing = new Subject<never>();
    vi.spyOn(service, 'getAnalytics').mockReturnValue(failing);

    const markForCheck = vi.spyOn(
      Object.getPrototypeOf(fixture.componentRef.changeDetectorRef),
      'markForCheck',
    );

    fixture.componentInstance.load();
    failing.error({ error: { detail: 'Rango no permitido' } });
    expect(markForCheck).toHaveBeenCalled();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Rango no permitido');
  });
  it('filters operational lists without altering server-calculated KPIs', async () => {
    const component = fixture.componentInstance;
    component.analytics = {
      fromDate: '2026-11-01', toDate: '2026-11-30',
      totalReservations: 5, confirmedReservations: 3, cancelledReservations: 1,
      recognizedRevenue: 600, bookedNights: 8, inventoryNights: 60,
      occupancyRate: 13.33, averageBookedNightlyRate: 75,
      apartments: [
        { apartmentId: 'a1', apartmentName: 'Vista Mar', bookedNights: 5,
          inventoryNights: 30, occupancyRate: 16.67, recognizedRevenue: 400 },
        { apartmentId: 'a2', apartmentName: 'Jardín', bookedNights: 3,
          inventoryNights: 30, occupancyRate: 10, recognizedRevenue: 200 },
      ],
      reservations: [
        { reservationId: 'r1', apartmentId: 'a1', apartmentName: 'Vista Mar',
          customerName: 'Ana', checkInDate: '2026-11-10', checkOutDate: '2026-11-12',
          guestCount: 2, status: 2, totalAmount: 200 },
        { reservationId: 'r2', apartmentId: 'a2', apartmentName: 'Jardín',
          customerName: 'Luis', checkInDate: '2026-11-15', checkOutDate: '2026-11-18',
          guestCount: 3, status: 1, totalAmount: 300 },
      ],
    };
    component.apartmentFilter = 'a1';
    component.reservationStatusFilter = 2;
    expect(component.visibleApartments.map((item) => item.apartmentId)).toEqual(['a1']);
    expect(component.visibleReservations.map((item) => item.reservationId)).toEqual(['r1']);
    expect(component.analytics.totalReservations).toBe(5);
    expect(component.analytics.recognizedRevenue).toBe(600);

    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.performance-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Noches de inventario');
    expect(fixture.nativeElement.textContent).toContain('Mostrando 1 de 2 estadías');
  });

  it('uses UTC date arithmetic for stay nights, independent of browser daylight savings', () => {
    const nights = fixture.componentInstance.reservationNights({
      reservationId: 'r1', apartmentId: 'a1', apartmentName: 'Vista Mar',
      customerName: 'Ana', checkInDate: '2026-03-07', checkOutDate: '2026-03-10',
      guestCount: 2, status: 2, totalAmount: 200,
    });
    expect(nights).toBe(3);
  });

});
