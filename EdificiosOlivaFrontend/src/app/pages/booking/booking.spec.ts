import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Apartments } from '../../core/services/apartments';
import { PublicBookingService } from '../../core/services/booking';
import { Booking } from './booking';

describe('Booking', () => {
  let component: Booking;
  let fixture: ComponentFixture<Booking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Booking],
      providers: [
        {
          provide: Apartments,
          useValue: {
            getAvailableApartments: () => of([]),
          },
        },
        {
          provide: PublicBookingService,
          useValue: {
            checkAvailability: () =>
              of({
                apartmentId: 'test-apartment',
                apartmentName: 'Apartamento de prueba',
                available: true,
                nights: 2,
                nightlyRate: 80,
                totalAmount: 160,
              }),
            create: () =>
              of({
                reservationId: 'test-reservation',
                confirmationCode: 'EO-TEST0001',
                customerName: 'Cliente de prueba',
                email: 'cliente@example.com',
                apartmentId: 'test-apartment',
                apartmentName: 'Apartamento de prueba',
                checkInDate: '2026-09-10',
                checkOutDate: '2026-09-12',
                guestCount: 2,
                nights: 2,
                nightlyRate: 80,
                totalAmount: 160,
                status: 0,
              }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Booking);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
