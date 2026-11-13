import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Apartments } from '../../../core/services/apartments';
import { Customers } from '../../../core/services/customers';
import { Reservations } from '../../../core/services/reservations';
import { BookingsAdmin } from './bookings-admin';

const booking = {
  id: 'abc12345-0000-0000-0000-000000000000',
  customerId: 'c1',
  customerName: 'Ana Pérez',
  apartmentId: 'a1',
  apartmentName: 'Vista Mar',
  checkInDate: '2026-11-20',
  checkOutDate: '2026-11-22',
  guestCount: 2,
  nightlyRate: 90,
  totalAmount: 180,
  status: 2,
  createdAtUtc: '2026-11-10T00:00:00Z',
};

describe('BookingsAdmin v1.3', () => {
  let component: BookingsAdmin;
  let fixture: ComponentFixture<BookingsAdmin>;
  let getAll: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getAll = vi.fn().mockReturnValue(of({
      items: [booking], page: 1, pageSize: 20, totalItems: 21, totalPages: 2,
      hasPreviousPage: false, hasNextPage: true,
    }));
    await TestBed.configureTestingModule({
      imports: [BookingsAdmin],
      providers: [
        { provide: Reservations, useValue: { getAll } },
        { provide: Customers, useValue: { getAll: () => of([]) } },
        { provide: Apartments, useValue: { getApartments: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('requests paginated results and renders a labelled mobile card', () => {
    expect(getAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }));
    expect(fixture.nativeElement.querySelector('.booking-card')?.textContent).toContain('Ana Pérez');
    expect(fixture.nativeElement.querySelector('.booking-card')?.textContent).toContain('Huéspedes');
    expect(component.pageEnd).toBe(20);
  });

  it('navigates pages and resets pagination when filters are applied', () => {
    component.changePage(1);
    expect(getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    component.search = 'Ana';
    component.applyFilters();
    expect(getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'Ana' }));
  });

  it('prevents navigation past the first page', () => {
    const calls = getAll.mock.calls.length;
    component.changePage(-1);
    expect(getAll).toHaveBeenCalledTimes(calls);
  });
});
