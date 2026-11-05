import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface PublicBookingRequest {
  fullName: string;
  email: string;
  phone: string;
  apartmentId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  notes?: string | null;
}

export interface BookingAvailability {
  apartmentId: string;
  apartmentName: string;
  available: boolean;
  nights: number;
  nightlyRate: number;
  totalAmount: number;
}

export interface PublicBookingConfirmation {
  reservationId: string;
  confirmationCode: string;
  customerName: string;
  email: string;
  apartmentId: string;
  apartmentName: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  nights: number;
  nightlyRate: number;
  totalAmount: number;
  status: number;
}

@Injectable({ providedIn: 'root' })
export class PublicBookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/public/bookings`;

  checkAvailability(
    apartmentId: string,
    checkInDate: string,
    checkOutDate: string,
    guestCount: number,
  ): Observable<BookingAvailability> {
    const params = new HttpParams()
      .set('apartmentId', apartmentId)
      .set('checkInDate', checkInDate)
      .set('checkOutDate', checkOutDate)
      .set('guestCount', String(guestCount));

    return this.http.get<BookingAvailability>(`${this.apiUrl}/availability`, {
      params,
    });
  }

  /**
   * `idempotencyKey` must be reused for retries of the same request: the backend
   * then returns the original reservation instead of creating a duplicate.
   */
  create(
    request: PublicBookingRequest,
    idempotencyKey?: string,
  ): Observable<PublicBookingConfirmation> {
    const headers = idempotencyKey
      ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
      : undefined;

    return this.http.post<PublicBookingConfirmation>(this.apiUrl, request, {
      headers,
    });
  }
}
