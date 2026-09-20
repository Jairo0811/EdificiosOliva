import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Apartment } from '../../core/models/apartment.model';
import { Apartments as ApartmentsService } from '../../core/services/apartments';

interface ApartmentSearchModel {
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
}

@Component({
  selector: 'app-apartments',
  imports: [RouterLink, FormsModule],
  templateUrl: './apartments.html',
  styleUrl: './apartments.css',
})
export class Apartments implements OnInit {
  private readonly apartmentsService = inject(ApartmentsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly minDate = this.toDateInputValue(new Date());

  apartments: Apartment[] = [];
  loading = true;
  errorMessage = '';
  searchError = '';

  search: ApartmentSearchModel = {
    checkInDate: '',
    checkOutDate: '',
    guestCount: 2,
  };

  ngOnInit(): void {
    this.apartmentsService
      .getAvailableApartments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (apartments) => {
          this.apartments = apartments;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading apartments:', error);
          this.errorMessage = 'No fue posible cargar los apartamentos disponibles.';
          this.loading = false;
        },
      });
  }

  get heroImageUrl(): string | null {
    return (
      this.apartments
        .flatMap((apartment) => apartment.images || [])
        .find((url) => Boolean(url?.trim())) ?? null
    );
  }

  searchAvailability(): void {
    this.searchError = '';

    const { checkInDate, checkOutDate } = this.search;
    const guestCount = Number(this.search.guestCount);

    if (!checkInDate || !checkOutDate) {
      this.searchError = 'Selecciona las fechas de entrada y salida para continuar.';
      return;
    }

    if (checkInDate < this.minDate) {
      this.searchError = 'La fecha de entrada no puede estar en el pasado.';
      return;
    }

    if (checkOutDate <= checkInDate) {
      this.searchError = 'La fecha de salida debe ser posterior a la fecha de entrada.';
      return;
    }

    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 100) {
      this.searchError = 'Selecciona una cantidad válida de huéspedes.';
      return;
    }

    void this.router.navigate(['/reservar'], {
      queryParams: {
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: guestCount,
      },
    });
  }

  getApartmentImage(apartment: Apartment): string {
    if (!apartment.images || apartment.images.length === 0) {
      return '/images/apartment-placeholder.webp';
    }

    return apartment.images[0];
  }

  handleImageError(event: Event): void {
    const image = event.target as HTMLImageElement;

    if (!image.src.endsWith('apartment-placeholder.webp')) {
      image.src = '/images/apartment-placeholder.webp';
    }
  }

  private toDateInputValue(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }
}
