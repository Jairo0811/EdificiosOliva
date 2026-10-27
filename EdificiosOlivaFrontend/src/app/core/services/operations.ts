import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface OperationsReservationItem {
  reservationId: string;
  apartmentId: string;
  apartmentName: string;
  customerName: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  status: number;
  totalAmount: number;
}

export interface ApartmentPerformanceItem {
  apartmentId: string;
  apartmentName: string;
  bookedNights: number;
  inventoryNights: number;
  occupancyRate: number;
  recognizedRevenue: number;
}

export interface OperationsAnalytics {
  fromDate: string;
  toDate: string;
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  recognizedRevenue: number;
  bookedNights: number;
  inventoryNights: number;
  occupancyRate: number;
  averageBookedNightlyRate: number;
  apartments: ApartmentPerformanceItem[];
  reservations: OperationsReservationItem[];
}

@Injectable({ providedIn: 'root' })
export class OperationsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/operations`;

  getAnalytics(fromDate: string, toDate: string): Observable<OperationsAnalytics> {
    return this.http.get<OperationsAnalytics>(`${this.endpoint}/analytics`, {
      params: this.rangeParams(fromDate, toDate),
    });
  }

  exportReservations(fromDate: string, toDate: string): Observable<Blob> {
    return this.http.get(`${this.endpoint}/reports/reservations.csv`, {
      params: this.rangeParams(fromDate, toDate),
      responseType: 'blob',
    });
  }

  exportPayments(fromDate: string, toDate: string): Observable<Blob> {
    return this.http.get(`${this.endpoint}/reports/payments.csv`, {
      params: this.rangeParams(fromDate, toDate),
      responseType: 'blob',
    });
  }

  publicCalendarUrl(apartmentId: string): string {
    return `${environment.apiUrl}/public/calendars/${apartmentId}.ics`;
  }

  private rangeParams(fromDate: string, toDate: string): HttpParams {
    return new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);
  }
}
