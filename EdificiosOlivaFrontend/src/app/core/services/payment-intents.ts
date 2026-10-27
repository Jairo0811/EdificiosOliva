import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult } from '../interfaces/paged-result.interface';

export interface PaymentIntentAdmin {
  id: string;
  reservationId: string;
  customerName: string;
  apartmentName: string;
  reservationTotal: number;
  amount: number;
  currency: string;
  provider: string;
  method: number;
  status: number;
  idempotencyKey: string;
  providerReference?: string | null;
  checkoutUrl?: string | null;
  paymentId?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  expiresAtUtc?: string | null;
  needsReview: boolean;
  succeededAtUtc?: string | null;
  failedAtUtc?: string | null;
  cancelledAtUtc?: string | null;
  refundedAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

export interface PaymentIntentQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  provider?: string;
  status?: number;
}

export interface ManualReconciliationRequest {
  outcome: number;
  providerTransactionId?: string | null;
  notes: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentIntentsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/payment-intents`;

  getAll(query: PaymentIntentQuery = {}): Observable<PagedResult<PaymentIntentAdmin>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 100));

    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.provider?.trim()) params = params.set('provider', query.provider.trim());
    if (query.status) params = params.set('status', String(query.status));

    return this.http.get<PagedResult<PaymentIntentAdmin>>(this.endpoint, { params });
  }

  reconcile(
    id: string,
    request: ManualReconciliationRequest,
  ): Observable<PaymentIntentAdmin> {
    return this.http.post<PaymentIntentAdmin>(
      `${this.endpoint}/${id}/reconcile`,
      request,
    );
  }
}
