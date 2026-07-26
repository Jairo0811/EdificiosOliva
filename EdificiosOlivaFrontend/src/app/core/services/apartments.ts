import { inject, Injectable } from '@angular/core';
import {
  catchError,
  firstValueFrom,
  map,
  Observable,
  of,
  throwError,
} from 'rxjs';

import {
  ApiApartment,
  ApartmentStatus,
} from '../models/apartment-api.model';
import {
  Apartment,
  ApartmentViewStatus,
} from '../models/apartment.model';
import { CreateApartmentRequest } from '../models/apartment-request.model';
import { ApartmentApiService } from './apartment-api.service';

interface ApiClientError extends Error {
  status?: number;
}

@Injectable({
  providedIn: 'root',
})
export class Apartments {
  private readonly apartmentApiService =
    inject(ApartmentApiService);

  getApartments(): Observable<Apartment[]> {
    return this.apartmentApiService
      .getAll({
        page: 1,
        pageSize: 100,
        sortBy: 'name',
        descending: false,
      })
      .pipe(
        map((result) =>
          result.items.map((apartment) =>
            this.toViewModel(apartment),
          ),
        ),
      );
  }

  getAvailableApartments(): Observable<Apartment[]> {
    return this.apartmentApiService
      .getAll({
        page: 1,
        pageSize: 100,
        status: ApartmentStatus.Available,
        sortBy: 'name',
        descending: false,
      })
      .pipe(
        map((result) =>
          result.items.map((apartment) =>
            this.toViewModel(apartment),
          ),
        ),
      );
  }

  getApartmentById(
    id: string,
  ): Observable<Apartment | null> {
    return this.apartmentApiService
      .getById(id)
      .pipe(
        map((apartment) => this.toViewModel(apartment)),
        catchError((error: ApiClientError) =>
          error.status === 404
            ? of(null)
            : throwError(() => error),
        ),
      );
  }

  async addApartment(
    apartment: Apartment,
  ): Promise<void> {
    await firstValueFrom(
      this.apartmentApiService.create(
        this.toApiRequest(apartment),
      ),
    );
  }

  async updateApartment(
    id: string,
    apartment: Apartment,
  ): Promise<void> {
    await firstValueFrom(
      this.apartmentApiService.update(
        id,
        this.toApiRequest(apartment),
      ),
    );
  }

  async updateApartmentStatus(
    id: string,
    status: ApartmentViewStatus,
  ): Promise<void> {
    const currentApartment = await firstValueFrom(
      this.apartmentApiService.getById(id),
    );

    await firstValueFrom(
      this.apartmentApiService.update(id, {
        name: currentApartment.name,
        description: currentApartment.description,
        pricePerNight: currentApartment.pricePerNight,
        guestCapacity: currentApartment.guestCapacity,
        bedrooms: currentApartment.bedrooms,
        bathrooms: currentApartment.bathrooms,
        location: currentApartment.location,
        status: this.toApiStatus(status),
      }),
    );
  }

  async deleteApartment(id: string): Promise<void> {
    await firstValueFrom(
      this.apartmentApiService.delete(id),
    );
  }

  private toViewModel(
    apartment: ApiApartment,
  ): Apartment {
    return {
      id: apartment.id,
      name: apartment.name,
      description: apartment.description,
      price: apartment.pricePerNight,
      guests: apartment.guestCapacity,
      bedrooms: apartment.bedrooms,
      bathrooms: apartment.bathrooms,
      location: apartment.location,
      status: this.toViewStatus(apartment.status),

      // Se conectarán cuando la API incluya imágenes y amenidades.
      amenities: [],
      images: [],

      createdAt: new Date(apartment.createdAtUtc),
      updatedAt: apartment.updatedAtUtc
        ? new Date(apartment.updatedAtUtc)
        : null,
    };
  }

  private toApiRequest(
    apartment: Apartment,
  ): CreateApartmentRequest {
    return {
      name: apartment.name.trim(),
      description: apartment.description.trim(),
      pricePerNight: apartment.price,
      guestCapacity: apartment.guests,
      bedrooms: apartment.bedrooms,
      bathrooms: apartment.bathrooms,
      location: apartment.location.trim(),
      status: this.toApiStatus(apartment.status),
    };
  }

  private toApiStatus(
    status: ApartmentViewStatus,
  ): ApartmentStatus {
    switch (status) {
      case 'Ocupado':
        return ApartmentStatus.Occupied;

      case 'Mantenimiento':
        return ApartmentStatus.Maintenance;

      case 'Disponible':
      default:
        return ApartmentStatus.Available;
    }
  }

  private toViewStatus(
    status: ApartmentStatus,
  ): ApartmentViewStatus {
    switch (status) {
      case ApartmentStatus.Occupied:
        return 'Ocupado';

      case ApartmentStatus.Maintenance:
        return 'Mantenimiento';

      case ApartmentStatus.Available:
      default:
        return 'Disponible';
    }
  }
}
