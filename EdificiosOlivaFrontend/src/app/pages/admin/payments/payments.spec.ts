import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Payments as PaymentsService } from '../../../core/services/payments';
import { Reservations } from '../../../core/services/reservations';
import { Payments } from './payments';

const payment = {
  id: 'abcdef12-0000-0000-0000-000000000000', reservationId: 'r1',
  customerName: 'Ana Pérez', apartmentName: 'Vista Mar', reservationTotal: 190,
  amount: 190, method: 4, status: 2, transactionId: 'TX-123',
  createdAtUtc: '2026-11-13T00:00:00Z',
};

describe('Payments v1.3', () => {
  let component: Payments;
  let fixture: ComponentFixture<Payments>;
  let getAll: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getAll = vi.fn().mockReturnValue(of({
      items: [payment], page: 1, pageSize: 20, totalItems: 21, totalPages: 2,
      hasPreviousPage: false, hasNextPage: true,
    }));
    await TestBed.configureTestingModule({
      imports: [Payments],
      providers: [
        { provide: PaymentsService, useValue: { getAll } },
        { provide: Reservations, useValue: { getAll: () => of({ items: [] }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Payments);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('requests paginated payments and renders mobile actions', () => {
    expect(getAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }));
    const card = fixture.nativeElement.querySelector('.payment-card');
    expect(card?.textContent).toContain('Ana Pérez');
    expect(card?.textContent).toContain('TX-123');
    expect(card?.querySelectorAll('.payment-card-actions button')).toHaveLength(3);
    expect(card?.querySelector('.refund-btn')?.disabled).toBe(false);
    expect(component.pageEnd).toBe(20);
  });

  it('navigates pages and resets when filters change', () => {
    component.changePage(1);
    expect(getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    component.search = 'Ana';
    component.applyFilters();
    expect(getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'Ana' }));
  });

  it('prevents navigation beyond the first page', () => {
    const calls = getAll.mock.calls.length;
    component.changePage(-1);
    expect(getAll).toHaveBeenCalledTimes(calls);
  });
});
