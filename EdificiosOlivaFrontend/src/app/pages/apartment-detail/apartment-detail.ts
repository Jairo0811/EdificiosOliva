import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import { Apartment } from '../../core/models/apartment.model';
import { Apartments as ApartmentsService } from '../../core/services/apartments';

@Component({
  selector: 'app-apartment-detail',
  imports: [RouterLink],
  templateUrl: './apartment-detail.html',
  styleUrl: './apartment-detail.css',
})
export class ApartmentDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apartmentsService = inject(ApartmentsService);
  private readonly destroyRef = inject(DestroyRef);

  apartment: Apartment | null = null;
  loading = true;
  checkInDate = '';
  checkOutDate = '';
  guestCount = 1;
  get minDate(): string { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); }
  reserve(): void {
    if (!this.apartment || !this.checkInDate || !this.checkOutDate || this.checkOutDate <= this.checkInDate) return;
    void this.router.navigate(['/reservar'], { queryParams: { apartmentId: this.apartment.id, checkInDate: this.checkInDate, checkOutDate: this.checkOutDate, guestCount: this.guestCount } });
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
      });
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
