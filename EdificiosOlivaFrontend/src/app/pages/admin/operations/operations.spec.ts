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
});
