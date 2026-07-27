import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResult } from '../interfaces/paged-result.interface';
import { Booking } from '../models/booking.model';

export interface ReservationRequest {
  customerId: string;
  apartmentId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  status: number;
  notes?: string | null;
}

export interface ReservationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}

@Injectable({ providedIn: 'root' })
export class Reservations {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reservations`;

  getAll(query: ReservationQuery = {}): Observable<PagedResult<Booking>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 100));

    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.status) params = params.set('status', String(query.status));
    if (query.fromDate) params = params.set('fromDate', query.fromDate);
    if (query.toDate) params = params.set('toDate', query.toDate);

    return this.http.get<PagedResult<Booking>>(this.apiUrl, { params });
  }

  create(request: ReservationRequest): Observable<Booking> {
    return this.http.post<Booking>(this.apiUrl, request);
  }

  update(id: string, request: ReservationRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
