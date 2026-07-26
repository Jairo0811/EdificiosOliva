export enum ApartmentStatus {
  Available = 1,
  Occupied = 2,
  Maintenance = 3,
}

export interface ApiApartment {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  guestCapacity: number;
  bedrooms: number;
  bathrooms: number;
  location: string;
  status: ApartmentStatus;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}