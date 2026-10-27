import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PaymentIntentsService } from '../../../core/services/payment-intents';
import { PaymentIntentsAdmin } from './payment-intents-admin';

describe('PaymentIntentsAdmin', () => {
  let component: PaymentIntentsAdmin;
  let fixture: ComponentFixture<PaymentIntentsAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentIntentsAdmin],
      providers: [
        {
          provide: PaymentIntentsService,
          useValue: {
            getAll: () =>
              of({
                items: [],
                page: 1,
                pageSize: 100,
                totalItems: 0,
                totalPages: 0,
                hasPreviousPage: false,
                hasNextPage: false,
              }),
            reconcile: () => of({}),
          },
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
});
