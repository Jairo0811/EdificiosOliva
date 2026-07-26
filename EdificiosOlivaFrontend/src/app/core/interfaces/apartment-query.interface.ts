import { ApartmentStatus } from '../models/apartment-api.model';

export interface ApartmentQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ApartmentStatus;
  minimumPrice?: number;
  maximumPrice?: number;
  minimumGuestCapacity?: number;
  sortBy?: 'name' | 'price' | 'capacity' | 'createdAt';
  descending?: boolean;
}