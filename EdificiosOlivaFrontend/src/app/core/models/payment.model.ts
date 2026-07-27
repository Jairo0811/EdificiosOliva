export interface Payment {
  id: string;
  reservationId: string;
  customerName: string;
  apartmentName: string;
  reservationTotal: number;
  amount: number;
  method: number;
  status: number;
  transactionId?: string | null;
  notes?: string | null;
  paidAtUtc?: string | null;
  refundedAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}
