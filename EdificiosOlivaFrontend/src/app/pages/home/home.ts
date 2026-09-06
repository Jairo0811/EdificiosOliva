import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Apartment } from '../../core/models/apartment.model';
import { Apartments as ApartmentsService } from '../../core/services/apartments';

interface AvailabilitySearchModel {
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly apartmentsService = inject(ApartmentsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly minDate = this.toDateInputValue(new Date());

  featuredApartments: Apartment[] = [];
  loadingApartments = true;
  apartmentsError = '';
  searchError = '';

  availabilitySearch: AvailabilitySearchModel = {
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
          this.featuredApartments = apartments.slice(0, 3);
          this.loadingApartments = false;
        },
        error: (error) => {
          console.error('Error loading featured apartments:', error);
          this.apartmentsError = 'No fue posible cargar los apartamentos destacados.';
          this.loadingApartments = false;
        },
      });
  }

  searchAvailability(): void {
    this.searchError = '';

    const { checkInDate, checkOutDate } = this.availabilitySearch;
    const guestCount = Number(this.availabilitySearch.guestCount);

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
    return apartment.images?.[0] || '/images/apartment-placeholder.webp';
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
