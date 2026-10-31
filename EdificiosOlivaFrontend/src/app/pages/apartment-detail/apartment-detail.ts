import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import { Apartment } from '../../core/models/apartment.model';
import { Apartments as ApartmentsService } from '../../core/services/apartments';
import { BookingAvailability, PublicBookingService } from '../../core/services/booking';
import { todayInPropertyZone } from '../../core/utils/property-date';

@Component({
  selector: 'app-apartment-detail',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './apartment-detail.html',
  styleUrl: './apartment-detail.css',
})
export class ApartmentDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apartmentsService = inject(ApartmentsService);
  private readonly bookingService = inject(PublicBookingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  apartment: Apartment | null = null;
  loading = true;
  checkInDate = '';
  checkOutDate = '';
  guestCount = 1;
  readonly minDate = todayInPropertyZone();

  readonly showAllPhotos = signal(false);

  readonly availability = signal<BookingAvailability | null>(null);
  readonly checking = signal(false);
  readonly availabilityError = signal('');

  /** Why the stay cannot be booked yet, or '' when the inputs are valid. */
  get validationMessage(): string {
    if (!this.checkInDate || !this.checkOutDate) {
      return 'Selecciona tus fechas de entrada y salida.';
    }
    if (this.checkInDate < this.minDate) {
      return 'La fecha de entrada no puede ser anterior a hoy.';
    }
    if (this.checkOutDate <= this.checkInDate) {
      return 'La salida debe ser posterior a la entrada.';
    }
    if (this.apartment && this.guestCount > this.apartment.guests) {
      return `Este apartamento admite hasta ${this.apartment.guests} huésped(es).`;
    }
    return '';
  }

  get canReserve(): boolean {
    return (
      !!this.apartment &&
      !this.validationMessage &&
      !this.checking() &&
      this.availability()?.available !== false
    );
  }

  onCheckInChange(value: string): void {
    this.checkInDate = value;
    this.resetAvailability();
  }

  onCheckOutChange(value: string): void {
    this.checkOutDate = value;
    this.resetAvailability();
  }

  onGuestsChange(value: string): void {
    this.guestCount = Number(value) || 1;
    this.resetAvailability();
  }

  checkAvailability(): void {
    const apartment = this.apartment;
    if (!apartment?.id || this.validationMessage || this.checking()) return;

    const requested = `${this.checkInDate}|${this.checkOutDate}|${this.guestCount}`;
    this.checking.set(true);
    this.availabilityError.set('');

    this.bookingService
      .checkAvailability(apartment.id, this.checkInDate, this.checkOutDate, this.guestCount)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.checking.set(false);
          // Ignore a response for inputs the visitor has already changed.
          if (requested === `${this.checkInDate}|${this.checkOutDate}|${this.guestCount}`) {
            this.availability.set(result);
          }
        },
        error: (error) => {
          this.checking.set(false);
          const detail = (error as { error?: { detail?: string } })?.error?.detail;
          this.availabilityError.set(detail || 'No fue posible comprobar la disponibilidad.');
        },
      });
  }

  reserve(): void {
    if (!this.apartment || !this.canReserve) return;

    void this.router.navigate(['/reservar'], {
      queryParams: {
        apartmentId: this.apartment.id,
        checkIn: this.checkInDate,
        checkOut: this.checkOutDate,
        guests: this.guestCount,
      },
    });
  }

  private resetAvailability(): void {
    this.availability.set(null);
    this.availabilityError.set('');
  }

  errorMessage = '';

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');

          if (!id) {
            this.errorMessage = 'El apartamento solicitado no es válido.';
            return of(null);
          }

          return this.apartmentsService.getApartmentById(id).pipe(
            catchError((error) => {
              console.error('Error loading apartment:', error);
              this.errorMessage = 'No fue posible cargar la información del apartamento.';
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((apartment) => {
        this.apartment = apartment;

        if (!apartment && !this.errorMessage) {
          this.errorMessage = 'El apartamento solicitado no existe.';
        }

        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  /** Up to five photos for the mosaic, or the placeholder when there are none. */
  mosaicImages(apartment: Apartment): string[] {
    const images = (apartment.images || []).filter(Boolean).slice(0, 5);
    return images.length > 0 ? images : ['/images/apartment-placeholder.webp'];
  }

  getMainImage(apartment: Apartment): string {
    return apartment.images?.[0] || '/images/apartment-placeholder.webp';
  }

  getGuestOptions(apartment: Apartment): number[] {
    return Array.from({ length: Math.max(apartment.guests, 1) }, (_, index) => index + 1);
  }

  handleImageError(event: Event): void {
    const image = event.target as HTMLImageElement;

    if (!image.src.endsWith('apartment-placeholder.webp')) {
      image.src = '/images/apartment-placeholder.webp';
    }
  }
}
