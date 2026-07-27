export type ReservationStatus =
  | 'Pendiente'
  | 'Confirmada'
  | 'En curso'
  | 'Completada'
  | 'Cancelada';

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  apartmentId: string;
  apartmentName: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  nightlyRate: number;
  totalAmount: number;
  status: number;
  notes?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}
