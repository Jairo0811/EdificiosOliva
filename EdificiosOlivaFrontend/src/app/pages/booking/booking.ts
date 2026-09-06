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
  prefilledFromSearch = false;

  private requestedApartmentId = '';

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
