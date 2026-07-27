import { ApartmentStatus } from './apartment-api.model';

export interface CreateApartmentRequest {
  name: string;
  description: string;
  pricePerNight: number;
  guestCapacity: number;
  bedrooms: number;
  bathrooms: number;
  location: string;
  status: ApartmentStatus;
  images: string[];
}

export type UpdateApartmentRequest = CreateApartmentRequest;
