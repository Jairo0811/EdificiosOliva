import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { Router, provideRouter } from '@angular/router';

import { BookingAvailability, PublicBookingService } from '../../core/services/booking';
import { ApartmentDetail } from './apartment-detail';

describe('ApartmentDetail', () => {
  let component: ApartmentDetail;
  let fixture: ComponentFixture<ApartmentDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApartmentDetail],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(ApartmentDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigates to /reservar with the query params the booking page reads', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.apartment = { id: 'apt-1' } as never;
    component.checkInDate = '2030-01-10';
    component.checkOutDate = '2030-01-15';
    component.guestCount = 3;
    component.reserve();

    expect(navigate).toHaveBeenCalledWith(['/reservar'], {
      queryParams: {
        apartmentId: 'apt-1',
        checkIn: '2030-01-10',
        checkOut: '2030-01-15',
        guests: 3,
      },
    });
  });

  it('does not navigate when checkout is not after checkin', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.apartment = { id: 'apt-1' } as never;
    component.checkInDate = '2030-01-10';
    component.checkOutDate = '2030-01-10';
    component.reserve();

    expect(navigate).not.toHaveBeenCalled();
  });

  describe('validation and availability', () => {
    const availability = (available: boolean): BookingAvailability => ({
      apartmentId: 'apt-1',
      apartmentName: 'Apto 1',
      available,
      nights: 5,
      nightlyRate: 80,
      totalAmount: 400,
    });

    beforeEach(() => {
      component.apartment = { id: 'apt-1', guests: 2 } as never;
    });

    it('asks for dates when none are selected', () => {
      expect(component.validationMessage).toContain('Selecciona tus fechas');
      expect(component.canReserve).toBe(false);
    });

    it('rejects past check-in dates', () => {
      component.onCheckInChange('2000-01-01');
      component.onCheckOutChange('2000-01-05');
      expect(component.validationMessage).toContain('anterior a hoy');
    });

    it('rejects more guests than the apartment capacity', () => {
      component.onCheckInChange('2999-01-10');
      component.onCheckOutChange('2999-01-12');
      component.onGuestsChange('3');
      expect(component.validationMessage).toContain('hasta 2');
      expect(component.canReserve).toBe(false);
    });

    it('is valid for a correct stay and allows reserving', () => {
      component.onCheckInChange('2999-01-10');
      component.onCheckOutChange('2999-01-12');
      expect(component.validationMessage).toBe('');
      expect(component.canReserve).toBe(true);
    });

    it('stores the backend availability and blocks reserve when unavailable', () => {
      const service = TestBed.inject(PublicBookingService);
      const spy = vi.spyOn(service, 'checkAvailability').mockReturnValue(of(availability(false)));
      component.onCheckInChange('2999-01-10');
      component.onCheckOutChange('2999-01-12');

      component.checkAvailability();

      expect(spy).toHaveBeenCalledWith('apt-1', '2999-01-10', '2999-01-12', 1);
      expect(component.availability()?.available).toBe(false);
      expect(component.canReserve).toBe(false);
    });

    it('clears the availability result when the dates change', () => {
      component.availability.set(availability(true));
      component.onCheckOutChange('2999-01-20');
      expect(component.availability()).toBeNull();
    });

    it('ignores a stale availability response after the inputs changed', () => {
      const service = TestBed.inject(PublicBookingService);
      const pending = new Subject<BookingAvailability>();
      vi.spyOn(service, 'checkAvailability').mockReturnValue(pending);
      component.onCheckInChange('2999-01-10');
      component.onCheckOutChange('2999-01-12');

      component.checkAvailability();
      component.onCheckOutChange('2999-01-15');
      pending.next(availability(true));

      expect(component.availability()).toBeNull();
      expect(component.checking()).toBe(false);
    });

    it('shows an error and does not block reserve when the check fails', () => {
      const service = TestBed.inject(PublicBookingService);
      vi.spyOn(service, 'checkAvailability').mockReturnValue(throwError(() => ({ status: 500 })));
      component.onCheckInChange('2999-01-10');
      component.onCheckOutChange('2999-01-12');

      component.checkAvailability();

      expect(component.availabilityError()).toContain('No fue posible');
      expect(component.checking()).toBe(false);
    });
  });
});
