import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import {
  PaymentIntentAdmin,
  PaymentIntentsService,
} from '../../../core/services/payment-intents';
import { PaymentIntentsAdmin } from './payment-intents-admin';

const page = (items: PaymentIntentAdmin[]) => ({
  items,
  page: 1,
  pageSize: 100,
  totalItems: items.length,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
});

const intent = {
  id: 'abcdef12-0000-0000-0000-000000000000',
  reservationId: 'r1',
  customerName: 'Ana Perez',
  apartmentName: 'Vista Mar',
  reservationTotal: 190,
  amount: 190,
  currency: 'USD',
  provider: 'AZUL',
  method: 1,
  status: 3,
  idempotencyKey: 'k',
  needsReview: true,
  createdAtUtc: '2030-01-01T00:00:00Z',
} as PaymentIntentAdmin;

describe('PaymentIntentsAdmin', () => {
  let component: PaymentIntentsAdmin;
  let fixture: ComponentFixture<PaymentIntentsAdmin>;
  const response$ = new Subject<ReturnType<typeof page>>();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentIntentsAdmin],
      providers: [
        {
          provide: PaymentIntentsService,
          useValue: { getAll: () => response$, reconcile: () => of({}) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentIntentsAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('marks the view dirty after the HTTP response arrives (zoneless repaint)', async () => {
    // The test harness auto-detects changes, so assert the explicit notification itself.
    const markForCheck = vi.spyOn(
      Object.getPrototypeOf(fixture.componentRef.changeDetectorRef),
      'markForCheck',
    );
    expect(fixture.nativeElement.textContent).not.toContain('ABCDEF12');

    response$.next(page([intent]));
    expect(markForCheck).toHaveBeenCalled();
    await fixture.whenStable();

    expect(component.loading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('ABCDEF12');
  });

  it('moves focus into the reconciliation dialog and closes it with Escape', () => {
    component.openReconciliation(intent);

    expect(document.activeElement?.classList.contains('reconcile-modal')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.selected).toBeNull();
  });

  it('does not close the dialog with Escape while saving', () => {
    component.openReconciliation(intent);
    component.saving = true;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.selected).not.toBeNull();
  });
});
