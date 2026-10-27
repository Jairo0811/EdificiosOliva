import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

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
});
