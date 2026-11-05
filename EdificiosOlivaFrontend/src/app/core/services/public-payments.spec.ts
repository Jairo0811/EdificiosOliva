import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PublicPaymentService, PublicPaymentState } from './public-payments';

const request = {
  reservationId: 'r1',
  confirmationCode: 'EO-ABCDEF12',
  email: 'a@b.com',
};

const status = (paymentState: number) => ({
  reservationId: 'r1',
  confirmationCode: 'EO-ABCDEF12',
  reservationStatus: 1,
  paymentState,
  paymentIntentId: null,
  amount: 100,
  currency: 'USD',
  checkedAtUtc: '2030-01-01T00:00:00Z',
});

describe('PublicPaymentService status', () => {
  let service: PublicPaymentService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PublicPaymentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queries the status with POST so email and code stay out of the URL', () => {
    service.getStatus(request).subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/public/payments/status'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(status(PublicPaymentState.Pending));
  });

  it('stops polling at the first non-pending state', () => {
    const received: number[] = [];
    service.pollStatus(request, 6, 1000).subscribe((s) => received.push(s.paymentState));
    vi.advanceTimersByTime(0);

    http.expectOne((r) => r.url.endsWith('/status')).flush(status(PublicPaymentState.Pending));
    vi.advanceTimersByTime(1000);
    http.expectOne((r) => r.url.endsWith('/status')).flush(status(PublicPaymentState.Confirmed));
    vi.advanceTimersByTime(10_000);

    http.expectNone((r) => r.url.endsWith('/status'));
    expect(received).toEqual([PublicPaymentState.Pending, PublicPaymentState.Confirmed]);
  });

  it('never polls more than the maximum number of attempts', () => {
    let completed = false;
    service.pollStatus(request, 3, 1000).subscribe({ complete: () => (completed = true) });
    vi.advanceTimersByTime(0);

    for (let attempt = 0; attempt < 3; attempt++) {
      http.expectOne((r) => r.url.endsWith('/status')).flush(status(PublicPaymentState.Pending));
      vi.advanceTimersByTime(1000);
    }

    http.expectNone((r) => r.url.endsWith('/status'));
    expect(completed).toBe(true);
  });

  it('propagates server errors so the UI can offer a retry', () => {
    let failed = false;
    service.pollStatus(request, 3, 1000).subscribe({ error: () => (failed = true) });
    vi.advanceTimersByTime(0);

    http
      .expectOne((r) => r.url.endsWith('/status'))
      .flush({ title: 'x' }, { status: 404, statusText: 'Not Found' });

    expect(failed).toBe(true);
  });
});
