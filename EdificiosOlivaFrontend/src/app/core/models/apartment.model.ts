export type ApartmentViewStatus =
  | 'Disponible'
  | 'Ocupado'
  | 'Mantenimiento';

export interface Apartment {
  id?: string;

  name: string;
  description: string;

  price: number;
  guests: number;
  bedrooms: number;
  bathrooms: number;

  location: string;
  status: ApartmentViewStatus;

  amenities: string[];
  images: string[];

  createdAt?: Date;
  updatedAt?: Date | null;
}