import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Apartment } from '../../core/models/apartment.model';
import { Apartments } from '../../core/services/apartments';
import {
  BookingAvailability,
  PublicBookingConfirmation,
  PublicBookingService,
} from '../../core/services/booking';
import {
  PublicPaymentCheckout,
  PublicPaymentService,
  PublicPaymentState,
  PublicPaymentStatus,
} from '../../core/services/public-payments';
import { PaymentStateView, describePaymentState } from '../../core/utils/payment-state';
import { todayInPropertyZone } from '../../core/utils/property-date';
import { repaint } from '../../core/utils/repaint';

interface BookingFormModel {
  fullName: string;
  email: string;
  phone: string;
  apartmentId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  notes: string;
}

@Component({
  selector: 'app-booking',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './booking.html',
  styleUrl: './booking.css',
})
export class Booking implements OnInit {
  private readonly apartmentsService = inject(Apartments);
  private readonly bookingService = inject(PublicBookingService);
  private readonly paymentService = inject(PublicPaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly minDate = todayInPropertyZone();
  readonly whatsappNumber = '18296196970';

  readonly steps = [
    { id: 1, label: 'Estadía' },
    { id: 2, label: 'Huésped' },
    { id: 3, label: 'Revisión' },
    { id: 4, label: 'Pago' },
    { id: 5, label: 'Resultado' },
  ] as const;

  currentStep = 1;
  attemptedGuestStep = false;
  private readonly touchedFields = new Set<string>();

  apartments: Apartment[] = [];
  availability: BookingAvailability | null = null;
  confirmation: PublicBookingConfirmation | null = null;
  loadingApartments = true;
  checkingAvailability = false;
  submitting = false;
  errorMessage = '';
  paymentError = '';
  prefilledFromSearch = false;
  paymentAvailable = false;
  loadingPaymentOptions = true;
  startingPayment = false;
  paymentTermsAccepted = false;
  paymentOutcome = '';
  paymentIntentId = '';
  /** Result of the backend verification after returning from AZUL. */
  paymentStatus: PublicPaymentStatus | null = null;
  verificationPhase: 'idle' | 'checking' | 'done' | 'error' | 'unavailable' = 'idle';

  private requestedApartmentId = '';
  private paymentIdempotencyKey = '';
  private bookingAttempt: { signature: string; key: string } | null = null;
  private readonly pendingBookingStorageKey = 'edificiosOliva.pendingBooking';

  form: BookingFormModel = {
    fullName: '',
    email: '',
    phone: '',
    apartmentId: '',
    checkInDate: '',
    checkOutDate: '',
    guestCount: 1,
    notes: '',
  };

  ngOnInit(): void {
    this.applyPaymentReturn();
    this.restoreConfirmationAfterPaymentReturn();
    this.startVerificationAfterPaymentReturn();
    if (this.paymentOutcome) {
      this.currentStep = 5;
    }
    this.loadPaymentProviders();
    this.applyQueryPrefill();

    this.apartmentsService.getAvailableApartments().pipe(repaint(this.cdr))
      .subscribe({
      next: (apartments) => {
        this.apartments = apartments.filter((apartment) => Boolean(apartment.id));
        this.loadingApartments = false;

        if (this.requestedApartmentId) {
          const requestedApartment = this.apartments.find(
            (apartment) => apartment.id === this.requestedApartmentId,
          );

          if (requestedApartment?.id) {
            this.form.apartmentId = requestedApartment.id;
          }
        }

        if (!this.form.apartmentId && this.apartments.length === 1) {
          this.form.apartmentId = this.apartments[0].id ?? '';
        }

        if (this.canCheckAvailability) {
          this.refreshAvailability();
        }
      },
      error: () => {
        this.loadingApartments = false;
        this.errorMessage = 'No fue posible cargar los apartamentos disponibles.';
      },
    });
  }

  get selectedApartment(): Apartment | undefined {
    return this.apartments.find((apartment) => apartment.id === this.form.apartmentId);
  }

  get bookingHeroImageUrl(): string | null {
    const selectedImage = this.selectedApartment?.images?.find((url) => Boolean(url?.trim()));

    if (selectedImage) {
      return selectedImage;
    }

    return (
      this.apartments
        .flatMap((apartment) => apartment.images || [])
        .find((url) => Boolean(url?.trim())) ?? null
    );
  }

  get canCheckAvailability(): boolean {
    return Boolean(
      this.form.apartmentId &&
        this.form.checkInDate &&
        this.form.checkOutDate &&
        this.form.guestCount > 0,
    );
  }

  refreshAvailability(): void {
    // Once the reservation exists the stay is locked: it is never recreated.
    if (this.confirmation) {
      return;
    }

    this.availability = null;
    this.errorMessage = '';

    if (!this.canCheckAvailability) {
      return;
    }

    if (this.form.checkInDate < this.minDate) {
      this.errorMessage = 'La fecha de entrada no puede estar en el pasado.';
      return;
    }

    if (this.form.checkOutDate <= this.form.checkInDate) {
      this.errorMessage = 'La fecha de salida debe ser posterior a la fecha de entrada.';
      return;
    }

    const apartment = this.selectedApartment;
    if (apartment && this.form.guestCount > apartment.guests) {
      this.errorMessage = `Este apartamento admite hasta ${apartment.guests} huésped(es).`;
      return;
    }

    this.checkingAvailability = true;
    this.bookingService
      .checkAvailability(
        this.form.apartmentId,
        this.form.checkInDate,
        this.form.checkOutDate,
        this.form.guestCount,
      )
      .pipe(repaint(this.cdr))
      .subscribe({
        next: (availability) => {
          this.availability = availability;
          this.checkingAvailability = false;

          if (!availability.available) {
            this.errorMessage = 'Las fechas seleccionadas ya no están disponibles.';
          }
        },
        error: (error) => {
          this.checkingAvailability = false;
          this.errorMessage = this.readProblemDetail(
            error,
            'No fue posible comprobar la disponibilidad.',
          );
        },
      });
  }

  submit(): void {
    if (this.submitting || this.confirmation) {
      return;
    }

    this.errorMessage = '';

    if (!this.paymentTermsAccepted) {
      this.errorMessage =
        'Acepta las políticas de reserva, cancelación, privacidad y pago para continuar.';
      return;
    }

    if (
      !this.form.fullName.trim() ||
      !this.form.email.trim() ||
      !this.form.phone.trim() ||
      !this.canCheckAvailability
    ) {
      this.errorMessage = 'Completa los datos del huésped y de la estadía.';
      return;
    }

    if (this.form.checkInDate < this.minDate) {
      this.errorMessage = 'La fecha de entrada no puede estar en el pasado.';
      return;
    }

    if (this.form.checkOutDate <= this.form.checkInDate) {
      this.errorMessage = 'La fecha de salida debe ser posterior a la fecha de entrada.';
      return;
    }

    if (!this.availability?.available) {
      this.errorMessage = 'Comprueba la disponibilidad antes de confirmar la reserva.';
      return;
    }

    const payload = {
      fullName: this.form.fullName.trim(),
      email: this.form.email.trim(),
      phone: this.form.phone.trim(),
      apartmentId: this.form.apartmentId,
      checkInDate: this.form.checkInDate,
      checkOutDate: this.form.checkOutDate,
      guestCount: this.form.guestCount,
      notes: this.form.notes.trim() || null,
    };

    // Same data => same key, so a retry after a timeout or a double click returns
    // the original reservation. Changed data => new key (a different request).
    const signature = JSON.stringify(payload);
    if (!this.bookingAttempt || this.bookingAttempt.signature !== signature) {
      this.bookingAttempt = { signature, key: this.createIdempotencyKey('booking') };
    }

    this.submitting = true;
    this.bookingService
      .create(payload, this.bookingAttempt.key)
      .pipe(repaint(this.cdr))
      .subscribe({
        next: (confirmation) => {
          this.confirmation = confirmation;
          this.availability = {
            apartmentId: confirmation.apartmentId,
            apartmentName: confirmation.apartmentName,
            available: true,
            nights: confirmation.nights,
            nightlyRate: confirmation.nightlyRate,
            totalAmount: confirmation.totalAmount,
          };
          this.persistPendingBooking(confirmation);
          this.submitting = false;
          this.setStep(4);
        },
        error: (error) => {
          this.submitting = false;
          this.errorMessage = this.readProblemDetail(
            error,
            'No fue posible registrar la reserva. Revisa los datos e intenta nuevamente.',
          );
        },
      });
  }

  get reservationLocked(): boolean {
    return this.confirmation !== null;
  }

  canVisit(step: number): boolean {
    if (step === this.currentStep) {
      return true;
    }

    // After the reservation is registered, steps 1-3 are read-only history.
    return this.reservationLocked ? step >= 4 : step < this.currentStep;
  }

  goToStep(step: number): void {
    if (this.canVisit(step)) {
      this.setStep(step);
    }
  }

  previousStep(): void {
    if (this.currentStep > 1 && this.canVisit(this.currentStep - 1)) {
      this.setStep(this.currentStep - 1);
    }
  }

  /** Enter key / primary button: advances the current step only when it is valid. */
  onStepSubmit(): void {
    switch (this.currentStep) {
      case 1:
        this.continueFromStay();
        break;
      case 2:
        this.continueFromGuest();
        break;
      case 3:
        this.submit();
        break;
      default:
        break;
    }
  }

  continueFromStay(): void {
    this.errorMessage = '';

    if (this.checkingAvailability) {
      return;
    }

    if (!this.canCheckAvailability) {
      this.errorMessage = 'Selecciona apartamento, fechas y huéspedes.';
      return;
    }

    if (!this.availability?.available) {
      this.errorMessage =
        this.errorMessage || 'Comprueba que las fechas estén disponibles antes de continuar.';
      return;
    }

    this.setStep(2);
  }

  continueFromGuest(): void {
    this.errorMessage = '';
    this.attemptedGuestStep = true;

    if (Object.keys(this.guestErrors).length > 0) {
      this.errorMessage = 'Revisa los campos marcados para continuar.';
      this.focusFirstInvalid();
      return;
    }

    this.setStep(3);
  }

  get guestErrors(): Partial<Record<'fullName' | 'email' | 'phone', string>> {
    const errors: Partial<Record<'fullName' | 'email' | 'phone', string>> = {};

    if (this.form.fullName.trim().length < 2) {
      errors.fullName = 'Ingresa tu nombre completo.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      errors.email = 'Ingresa un correo electrónico válido.';
    }

    const phone = this.form.phone.trim();
    if (phone.replace(/\D/g, '').length < 7 || phone.length > 30) {
      errors.phone = 'Ingresa un teléfono válido (mínimo 7 dígitos).';
    }

    return errors;
  }

  fieldError(field: 'fullName' | 'email' | 'phone'): string {
    return this.attemptedGuestStep || this.touchedFields.has(field)
      ? (this.guestErrors[field] ?? '')
      : '';
  }

  touch(field: string): void {
    this.touchedFields.add(field);
  }

  private setStep(step: number): void {
    this.currentStep = step;
    this.errorMessage = '';
    this.cdr.detectChanges();

    if (step === 5 && this.confirmation && this.verificationPhase === 'idle') {
      this.verifyPayment();
    }

    if (typeof document !== 'undefined') {
      document.getElementById('step-heading')?.focus();
    }
  }

  private focusFirstInvalid(): void {
    this.cdr.detectChanges();
    if (typeof document !== 'undefined') {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }

  get paymentOutcomeMessage(): string {
    switch (this.paymentOutcome) {
      case 'approved':
        return 'Recibimos el retorno de AZUL con el pago aprobado. Edificios Oliva verifica la confirmación en su sistema; conserva tu código de reserva y revisa tu correo.';
      case 'declined':
        return 'AZUL declinó el pago. Puedes reintentar mientras la reserva conserve saldo pendiente.';
      case 'cancelled':
        return 'Cancelaste el proceso de pago. No se registró ningún cargo confirmado.';
      case 'invalid':
        return 'No fue posible validar la respuesta de la pasarela. No se registró el pago.';
      case 'unverified':
        return 'Recibimos el retorno de la pasarela, pero no pudo aplicarse automáticamente. Contacta a Edificios Oliva antes de volver a pagar.';
      default:
        return '';
    }
  }

  /** View model for the backend-reported payment state (null until verified). */
  get paymentView(): PaymentStateView | null {
    return this.paymentStatus ? describePaymentState(this.paymentStatus.paymentState) : null;
  }

  get paymentConfirmedByBackend(): boolean {
    return this.paymentStatus?.paymentState === PublicPaymentState.Confirmed;
  }

  get paymentStillPending(): boolean {
    return this.paymentStatus?.paymentState === PublicPaymentState.Pending;
  }

  /**
   * Online payment can only start when the backend says no payment is in flight
   * or settled. After a gateway return, an unverified state blocks a new charge.
   */
  get canStartPayment(): boolean {
    if (!this.paymentAvailable || this.loadingPaymentOptions) {
      return false;
    }

    if (this.verificationPhase === 'checking') {
      return false;
    }

    if (this.paymentView) {
      return this.paymentView.canRetryPayment;
    }

    // Returned from the gateway but not verified yet: never offer a second charge.
    return !this.paymentOutcome;
  }

  /** Asks the backend for the real state; the URL outcome is never trusted. */
  verifyPayment(): void {
    if (this.verificationPhase === 'checking') {
      return;
    }

    if (!this.confirmation) {
      this.verificationPhase = 'unavailable';
      return;
    }

    this.verificationPhase = 'checking';
    this.paymentStatus = null;
    this.paymentService
      .pollStatus({
        reservationId: this.confirmation.reservationId,
        confirmationCode: this.confirmation.confirmationCode,
        email: this.confirmation.email,
        paymentIntentId: this.isGuid(this.paymentIntentId) ? this.paymentIntentId : null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef), repaint(this.cdr))
      .subscribe({
        next: (status) => {
          this.paymentStatus = status;
        },
        error: () => {
          this.verificationPhase = 'error';
        },
        complete: () => {
          this.verificationPhase = 'done';
        },
      });
  }

  startOnlinePayment(): void {
    this.paymentError = '';

    if (!this.confirmation) {
      this.paymentError = 'Primero debes registrar la reserva.';
      return;
    }

    if (!this.paymentAvailable) {
      this.paymentError = 'El pago en línea no está habilitado en este momento.';
      return;
    }

    if (!this.canStartPayment || this.startingPayment) {
      this.paymentError =
        'Verifica primero el estado de tu pago anterior para evitar un cobro duplicado.';
      return;
    }

    if (!this.paymentTermsAccepted) {
      this.paymentError = 'Confirma los datos de la reserva antes de continuar al portal de pago.';
      return;
    }

    if (!this.paymentIdempotencyKey) {
      this.paymentIdempotencyKey = this.createIdempotencyKey(
        `azul-${this.confirmation.reservationId}`,
      );
    }

    this.startingPayment = true;
    this.paymentService
      .createCheckout({
        reservationId: this.confirmation.reservationId,
        confirmationCode: this.confirmation.confirmationCode,
        email: this.confirmation.email,
        idempotencyKey: this.paymentIdempotencyKey,
        provider: 'AZUL',
      })
      .pipe(repaint(this.cdr))
      .subscribe({
        next: (checkout) => {
          this.persistPendingBooking(this.confirmation!);
          this.startingPayment = false;
          this.submitHostedCheckout(checkout);
        },
        error: (error) => {
          this.startingPayment = false;
          this.paymentError = this.readProblemDetail(
            error,
            'No fue posible iniciar el pago en línea. Puedes reintentar sin crear un cobro duplicado.',
          );
        },
      });
  }

  printReceipt(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  get whatsappConfirmationUrl(): string {
    if (!this.confirmation) {
      return `https://wa.me/${this.whatsappNumber}`;
    }

    const message = [
      `Hola, acabo de registrar la reserva ${this.confirmation.confirmationCode}.`,
      `Apartamento: ${this.confirmation.apartmentName}`,
      `Entrada: ${this.confirmation.checkInDate}`,
      `Salida: ${this.confirmation.checkOutDate}`,
      `Total: US$${this.confirmation.totalAmount.toFixed(2)}`,
      'Quiero coordinar la confirmación y el pago.',
    ].join('\n');

    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  private loadPaymentProviders(): void {
    this.paymentService.getProviders().pipe(repaint(this.cdr))
      .subscribe({
      next: (providers) => {
        this.paymentAvailable = providers.some(
          (provider) => provider.provider.toUpperCase() === 'AZUL',
        );
        this.loadingPaymentOptions = false;
      },
      error: () => {
        this.paymentAvailable = false;
        this.loadingPaymentOptions = false;
      },
    });
  }

  private applyPaymentReturn(): void {
    const params = this.route.snapshot.queryParamMap;
    const payment = params.get('payment')?.trim().toLowerCase() ?? '';
    const allowed = new Set([
      'approved',
      'declined',
      'cancelled',
      'invalid',
      'unverified',
    ]);

    if (allowed.has(payment)) {
      this.paymentOutcome = payment;
      this.paymentIntentId = params.get('intent')?.trim() ?? '';
    }
  }

  private restoreConfirmationAfterPaymentReturn(): void {
    if (!this.paymentOutcome || typeof window === 'undefined') {
      return;
    }

    const stored = window.sessionStorage.getItem(this.pendingBookingStorageKey);
    if (!stored) {
      return;
    }

    try {
      const confirmation = JSON.parse(stored) as PublicBookingConfirmation;
      if (confirmation?.reservationId && confirmation?.confirmationCode) {
        this.confirmation = confirmation;
      }
    } catch {
      window.sessionStorage.removeItem(this.pendingBookingStorageKey);
    }
  }

  private startVerificationAfterPaymentReturn(): void {
    if (!this.paymentOutcome) {
      return;
    }

    if (this.confirmation) {
      this.verifyPayment();
    } else {
      this.verificationPhase = 'unavailable';
    }
  }

  private isGuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private persistPendingBooking(confirmation: PublicBookingConfirmation): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(
      this.pendingBookingStorageKey,
      JSON.stringify(confirmation),
    );
  }

  private submitHostedCheckout(checkout: PublicPaymentCheckout): void {
    if (typeof document === 'undefined') {
      this.paymentError = 'El checkout hospedado solo puede abrirse desde el navegador.';
      return;
    }

    const form = document.createElement('form');
    form.method = checkout.method || 'POST';
    form.action = checkout.actionUrl;
    form.style.display = 'none';

    Object.entries(checkout.fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  private createIdempotencyKey(prefix: string): string {
    const suffix =
      typeof globalThis.crypto !== 'undefined' &&
      typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${prefix}-${suffix}`.slice(0, 100);
  }

  private applyQueryPrefill(): void {
    const params = this.route.snapshot.queryParamMap;
    const checkIn = params.get('checkIn')?.trim() ?? '';
    const checkOut = params.get('checkOut')?.trim() ?? '';
    const guests = Number(params.get('guests'));
    const apartmentId = params.get('apartmentId')?.trim() ?? '';
    let applied = false;

    if (
      this.isDateInputValue(checkIn) &&
      this.isDateInputValue(checkOut) &&
      checkIn >= this.minDate &&
      checkOut > checkIn
    ) {
      this.form.checkInDate = checkIn;
      this.form.checkOutDate = checkOut;
      applied = true;
    }

    if (Number.isInteger(guests) && guests >= 1 && guests <= 100) {
      this.form.guestCount = guests;
      applied = true;
    }

    if (apartmentId) {
      this.requestedApartmentId = apartmentId;
      applied = true;
    }

    this.prefilledFromSearch = applied;
  }

  private isDateInputValue(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private readProblemDetail(error: unknown, fallback: string): string {
    const candidate = error as { error?: { detail?: string; title?: string } };
    return candidate?.error?.detail || candidate?.error?.title || fallback;
  }
}
