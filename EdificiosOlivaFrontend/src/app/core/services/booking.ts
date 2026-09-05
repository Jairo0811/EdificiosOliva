import { HttpClient, HttpParams } from '@angular/common/http';
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

  create(request: PublicBookingRequest): Observable<PublicBookingConfirmation> {
    return this.http.post<PublicBookingConfirmation>(this.apiUrl, request);
  }
}
