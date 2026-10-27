import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

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
});
