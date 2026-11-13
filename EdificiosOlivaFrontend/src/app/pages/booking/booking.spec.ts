import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { Apartments } from '../../core/services/apartments';
import { PublicBookingService } from '../../core/services/booking';
import {
  PublicPaymentService,
  PublicPaymentState,
  PublicPaymentStatus,
} from '../../core/services/public-payments';
import { Booking } from './booking';

const statusOf = (paymentState: PublicPaymentState): PublicPaymentStatus => ({
  reservationId: 'test-reservation',
  confirmationCode: 'EO-TEST0001',
  reservationStatus: paymentState === PublicPaymentState.Confirmed ? 2 : 1,
  paymentState,
  paymentIntentId: null,
  amount: 160,
  currency: 'USD',
  checkedAtUtc: '2030-01-01T00:00:00Z',
});

const confirmationFixture = {
  reservationId: 'test-reservation',
  confirmationCode: 'EO-TEST0001',
  capabilityToken: 'A'.repeat(64),
  customerName: 'Cliente de prueba',
  email: 'cliente@example.com',
  apartmentId: 'test-apartment',
  apartmentName: 'Apartamento de prueba',
  checkInDate: '2030-09-10',
  checkOutDate: '2030-09-12',
  guestCount: 2,
  nights: 2,
  nightlyRate: 80,
  totalAmount: 160,
  status: 1,
};

describe('Booking', () => {
  let component: Booking;
  let fixture: ComponentFixture<Booking>;
  const pollStatus = vi.fn();
  const create = vi.fn();

  beforeEach(async () => {
    pollStatus.mockReset();
    create.mockReset();
    create.mockReturnValue(of(confirmationFixture));
    window.sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Booking],
      providers: [
        provideRouter([]),
        {
          provide: Apartments,
          useValue: {
            getAvailableApartments: () => of([]),
          },
        },
        {
          provide: PublicPaymentService,
          useValue: {
            getProviders: () => of([{ provider: 'AZUL', method: 1 }]),
            pollStatus: (...args: unknown[]) => pollStatus(...args),
            createCheckout: () =>
              of({
                paymentIntentId: 'test-intent',
                provider: 'AZUL',
                status: 3,
                amount: 160,
                currency: 'USD',
                actionUrl: 'https://pruebas.azul.com.do/PaymentPage/',
                alternateActionUrl: null,
                method: 'POST',
                fields: {},
                expiresAtUtc: null,
              }),
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
            create: (...args: unknown[]) => create(...args),
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

  it('does not claim the reservation is confirmed from the URL outcome alone', () => {
    component.paymentOutcome = 'approved';

    const message = component.paymentOutcomeMessage;

    expect(message).toContain('verifica');
    expect(message).not.toContain('quedó confirmada');
  });

  describe('payment verification (backend is the source of truth)', () => {
    beforeEach(() => {
      component.confirmation = { ...confirmationFixture };
      component.paymentOutcome = 'approved';
    });

    it('does not confirm when the backend still reports Pending, and blocks a second charge', () => {
      pollStatus.mockReturnValue(of(statusOf(PublicPaymentState.Pending)));

      component.verifyPayment();

      expect(component.paymentConfirmedByBackend).toBe(false);
      expect(component.paymentStillPending).toBe(true);
      expect(component.canStartPayment).toBe(false);
    });

    it('confirms only when the backend reports Confirmed', () => {
      pollStatus.mockReturnValue(of(statusOf(PublicPaymentState.Confirmed)));

      component.verifyPayment();

      expect(component.paymentConfirmedByBackend).toBe(true);
      expect(component.paymentView?.tone).toBe('success');
      expect(component.canStartPayment).toBe(false);
    });

    it('does not confirm a manipulated return (?payment=approved without a real payment)', () => {
      pollStatus.mockReturnValue(of(statusOf(PublicPaymentState.NotStarted)));

      component.verifyPayment();

      expect(component.paymentOutcome).toBe('approved');
      expect(component.paymentConfirmedByBackend).toBe(false);
    });

    it('shows a rejected payment and allows a retry', () => {
      pollStatus.mockReturnValue(of(statusOf(PublicPaymentState.Declined)));
      component.paymentAvailable = true;
      component.loadingPaymentOptions = false;

      component.verifyPayment();

      expect(component.paymentView?.title).toBe('Pago rechazado');
      expect(component.canStartPayment).toBe(true);
    });

    it('sends an uncertain state to administrative review without allowing a new charge', () => {
      pollStatus.mockReturnValue(of(statusOf(PublicPaymentState.RequiresReview)));

      component.verifyPayment();

      expect(component.paymentView?.tone).toBe('warning');
      expect(component.canStartPayment).toBe(false);
    });

    it('handles server and network errors without assuming the payment failed', () => {
      pollStatus.mockReturnValue(throwError(() => new Error('500')));

      component.verifyPayment();

      expect(component.verificationPhase).toBe('error');
      expect(component.paymentConfirmedByBackend).toBe(false);
      expect(component.canStartPayment).toBe(false);
    });

    it('recovers when the user retries after an error', () => {
      pollStatus.mockReturnValueOnce(throwError(() => new Error('offline')));
      component.verifyPayment();
      pollStatus.mockReturnValueOnce(of(statusOf(PublicPaymentState.Confirmed)));

      component.verifyPayment();

      expect(component.verificationPhase).toBe('done');
      expect(component.paymentConfirmedByBackend).toBe(true);
    });

    it('does not start a second verification while one is running', () => {
      pollStatus.mockReturnValue(NEVER);

      component.verifyPayment();
      component.verifyPayment();

      expect(pollStatus).toHaveBeenCalledTimes(1);
    });

    it('passes only a well-formed payment intent id as scope', () => {
      pollStatus.mockReturnValue(of(statusOf(PublicPaymentState.Pending)));
      component.paymentIntentId = 'not-a-guid';
      component.verifyPayment();
      expect(pollStatus.mock.calls[0][0].paymentIntentId).toBeNull();

      component.paymentIntentId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
      component.verifyPayment();
      expect(pollStatus.mock.calls[1][0].paymentIntentId).toBe(
        '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      );
    });

    it('reports unavailable when the reservation cannot be recovered in this browser', () => {
      component.confirmation = null;

      component.verifyPayment();

      expect(component.verificationPhase).toBe('unavailable');
      expect(pollStatus).not.toHaveBeenCalled();
    });
  });

  describe('idempotent booking creation', () => {
    beforeEach(() => {
      component.paymentTermsAccepted = true;
      component.form = {
        fullName: 'Cliente de prueba',
        email: 'cliente@example.com',
        phone: '8095551234',
        apartmentId: 'test-apartment',
        checkInDate: '2030-09-10',
        checkOutDate: '2030-09-12',
        guestCount: 2,
        notes: '',
      };
      component.availability = {
        apartmentId: 'test-apartment',
        apartmentName: 'Apartamento de prueba',
        available: true,
        nights: 2,
        nightlyRate: 80,
        totalAmount: 160,
      };
    });

    it('sends an Idempotency-Key and ignores a second click while submitting', () => {
      create.mockReturnValue(NEVER);

      component.submit();
      component.submit();

      expect(create).toHaveBeenCalledTimes(1);
      expect(create.mock.calls[0][1]).toMatch(/^booking-.{8,}/);
    });

    it('reuses the same key when retrying identical data after a failure', () => {
      create.mockReturnValueOnce(throwError(() => new Error('timeout')));
      component.submit();
      create.mockReturnValueOnce(of(confirmationFixture));

      component.submit();

      expect(create).toHaveBeenCalledTimes(2);
      expect(create.mock.calls[1][1]).toBe(create.mock.calls[0][1]);
    });

    it('uses a new key when the data changes', () => {
      create.mockReturnValueOnce(throwError(() => new Error('timeout')));
      component.submit();
      component.form.guestCount = 3;
      create.mockReturnValueOnce(of(confirmationFixture));

      component.submit();

      expect(create.mock.calls[1][1]).not.toBe(create.mock.calls[0][1]);
    });
  });

  describe('stepper', () => {
    const fillStay = () => {
      component.form.apartmentId = 'test-apartment';
      component.form.checkInDate = '2030-09-10';
      component.form.checkOutDate = '2030-09-12';
      component.availability = {
        apartmentId: 'test-apartment',
        apartmentName: 'Apartamento de prueba',
        available: true,
        nights: 2,
        nightlyRate: 80,
        totalAmount: 160,
      };
    };

    it('starts at step 1 and cannot advance without confirmed availability', () => {
      component.continueFromStay();

      expect(component.currentStep).toBe(1);
      expect(component.errorMessage).not.toBe('');
    });

    it('advances to the guest step once availability is confirmed', () => {
      fillStay();

      component.continueFromStay();

      expect(component.currentStep).toBe(2);
    });

    it('validates guest data with accessible per-field errors and keeps the step', () => {
      fillStay();
      component.continueFromStay();
      component.form.email = 'no-es-correo';

      component.continueFromGuest();

      expect(component.currentStep).toBe(2);
      expect(component.fieldError('fullName')).toBeTruthy();
      expect(component.fieldError('email')).toBeTruthy();
      expect(component.fieldError('phone')).toBeTruthy();
    });

    it('keeps guest data when going back and forward', () => {
      fillStay();
      component.continueFromStay();
      Object.assign(component.form, {
        fullName: 'Ana Perez',
        email: 'ana@example.com',
        phone: '8095551234',
      });
      component.continueFromGuest();

      component.previousStep();
      component.previousStep();
      component.continueFromStay();

      expect(component.currentStep).toBe(2);
      expect(component.form.fullName).toBe('Ana Perez');
      expect(component.guestErrors).toEqual({});
    });

    it('does not register the reservation until the policies are accepted', () => {
      fillStay();
      Object.assign(component.form, {
        fullName: 'Ana Perez',
        email: 'ana@example.com',
        phone: '8095551234',
      });

      component.submit();

      expect(create).not.toHaveBeenCalled();
      expect(component.errorMessage).toContain('políticas');
    });

    it('moves to payment after registering and never recreates the reservation', () => {
      fillStay();
      Object.assign(component.form, {
        fullName: 'Ana Perez',
        email: 'ana@example.com',
        phone: '8095551234',
      });
      component.paymentTermsAccepted = true;

      component.submit();
      component.submit();

      expect(create).toHaveBeenCalledTimes(1);
      expect(component.currentStep).toBe(4);
      expect(component.reservationLocked).toBe(true);
      expect(component.canVisit(1)).toBe(false);
      expect(component.canVisit(2)).toBe(false);
      expect(component.canVisit(5)).toBe(true);
    });

    it('does not wipe the registered reservation when availability is refreshed', () => {
      component.confirmation = { ...confirmationFixture };

      component.refreshAvailability();

      expect(component.confirmation).not.toBeNull();
    });
  });
});
