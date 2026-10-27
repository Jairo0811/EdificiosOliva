import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface PublicPaymentProvider {
  provider: string;
  method: number;
}

export interface PublicPaymentCheckoutRequest {
  reservationId: string;
  confirmationCode: string;
  email: string;
  idempotencyKey: string;
  provider: string;
}

export interface PublicPaymentCheckout {
  paymentIntentId: string;
  provider: string;
  status: number;
  amount: number;
  currency: string;
  actionUrl: string;
  alternateActionUrl?: string | null;
  method: string;
  fields: Record<string, string>;
  expiresAtUtc?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PublicPaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/public/payments`;

  getProviders(): Observable<PublicPaymentProvider[]> {
    return this.http.get<PublicPaymentProvider[]>(`${this.apiUrl}/providers`);
  }

  createCheckout(
    request: PublicPaymentCheckoutRequest,
  ): Observable<PublicPaymentCheckout> {
    return this.http.post<PublicPaymentCheckout>(
      `${this.apiUrl}/checkout`,
      request,
    );
  }
}
