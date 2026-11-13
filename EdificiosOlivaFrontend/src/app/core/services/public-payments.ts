import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concatMap, take, takeWhile, timer } from 'rxjs';

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

/** Mirrors the backend PublicPaymentState enum (serialized as a number). */
export const PublicPaymentState = {
  NotStarted: 0,
  Pending: 1,
  Confirmed: 2,
  Declined: 3,
  Cancelled: 4,
  Refunded: 5,
  RequiresReview: 6,
} as const;

export type PublicPaymentState =
  (typeof PublicPaymentState)[keyof typeof PublicPaymentState];

export interface PublicPaymentStatusRequest {
  reservationId: string;
  confirmationCode: string;
  email: string;
  paymentIntentId?: string | null;
}

export interface PublicPaymentStatus {
  reservationId: string;
  confirmationCode: string;
  reservationStatus: number;
  paymentState: PublicPaymentState;
  paymentIntentId?: string | null;
  amount: number;
  currency: string;
  checkedAtUtc: string;
}

export const STATUS_POLL_MAX_ATTEMPTS = 6;
export const STATUS_POLL_INTERVAL_MS = 4000;

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

  /** Read-only query; the backend is the only source of truth for the payment state. */
  getStatus(request: PublicPaymentStatusRequest): Observable<PublicPaymentStatus> {
    return this.http.post<PublicPaymentStatus>(`${this.apiUrl}/status`, request);
  }

  /**
   * Bounded polling: emits every result, stops at the first state other than
   * Pending, and never exceeds `maxAttempts` requests (no infinite polling).
   * Requests never overlap. Errors propagate so the caller can offer a retry.
   */
  pollStatus(
    request: PublicPaymentStatusRequest,
    maxAttempts = STATUS_POLL_MAX_ATTEMPTS,
    intervalMs = STATUS_POLL_INTERVAL_MS,
  ): Observable<PublicPaymentStatus> {
    return timer(0, intervalMs).pipe(
      take(maxAttempts),
      concatMap(() => this.getStatus(request)),
      takeWhile((status) => status.paymentState === PublicPaymentState.Pending, true),
    );
  }
}
