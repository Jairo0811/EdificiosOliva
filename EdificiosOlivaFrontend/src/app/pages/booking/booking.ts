import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

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
} from '../../core/services/public-payments';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './booking.html',
  styleUrl: './booking.css',
})
export class Booking implements OnInit {
  private readonly apartmentsService = inject(Apartments);
  private readonly bookingService = inject(PublicBookingService);
  private readonly paymentService = inject(PublicPaymentService);
  private readonly route = inject(ActivatedRoute);

  readonly minDate = this.toDateInputValue(new Date());
  readonly whatsappNumber = '18296196970';

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

  private requestedApartmentId = '';
  private paymentIdempotencyKey = '';
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
    this.loadPaymentProviders();
    this.applyQueryPrefill();

    this.apartmentsService.getAvailableApartments().subscribe({
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
    this.confirmation = null;
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
    this.errorMessage = '';
    this.confirmation = null;

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

    this.submitting = true;
    this.bookingService
      .create({
        fullName: this.form.fullName.trim(),
        email: this.form.email.trim(),
        phone: this.form.phone.trim(),
        apartmentId: this.form.apartmentId,
        checkInDate: this.form.checkInDate,
        checkOutDate: this.form.checkOutDate,
        guestCount: this.form.guestCount,
        notes: this.form.notes.trim() || null,
      })
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

  get paymentOutcomeMessage(): string {
    switch (this.paymentOutcome) {
      case 'approved':
        return 'Pago aprobado y validado. La reserva quedó confirmada en el sistema.';
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

    if (!this.paymentTermsAccepted) {
      this.paymentError = 'Confirma los datos de la reserva antes de continuar al portal de pago.';
      return;
    }

    if (!this.paymentIdempotencyKey) {
      this.paymentIdempotencyKey = this.createPaymentIdempotencyKey(
        this.confirmation.reservationId,
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
    this.paymentService.getProviders().subscribe({
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

  private createPaymentIdempotencyKey(reservationId: string): string {
    const suffix =
      typeof globalThis.crypto !== 'undefined' &&
      typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `azul-${reservationId}-${suffix}`.slice(0, 100);
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

  private toDateInputValue(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }

  private readProblemDetail(error: unknown, fallback: string): string {
    const candidate = error as { error?: { detail?: string; title?: string } };
    return candidate?.error?.detail || candidate?.error?.title || fallback;
  }
}
