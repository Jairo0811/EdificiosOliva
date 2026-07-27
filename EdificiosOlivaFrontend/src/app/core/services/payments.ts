import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult } from '../interfaces/paged-result.interface';
import { Payment } from '../models/payment.model';

export interface PaymentRequest {
  reservationId: string;
  amount: number;
  method: number;
  status: number;
  transactionId?: string | null;
  notes?: string | null;
}

export interface PaymentQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: number;
  method?: number;
}

@Injectable({ providedIn: 'root' })
export class Payments {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/payments`;

  getAll(query: PaymentQuery = {}): Observable<PagedResult<Payment>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 100));

    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.status) params = params.set('status', String(query.status));
    if (query.method) params = params.set('method', String(query.method));

    return this.http.get<PagedResult<Payment>>(this.endpoint, { params });
  }

  create(request: PaymentRequest): Observable<Payment> {
    return this.http.post<Payment>(this.endpoint, request);
  }

  update(id: string, request: PaymentRequest): Observable<void> {
    return this.http.put<void>(`${this.endpoint}/${id}`, request);
  }

  refund(id: string): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/${id}/refund`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
