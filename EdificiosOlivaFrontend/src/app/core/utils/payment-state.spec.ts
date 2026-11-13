import { PublicPaymentState } from '../services/public-payments';
import { describePaymentState } from './payment-state';

describe('describePaymentState', () => {
  it('only Confirmed is presented as success', () => {
    const tones = Object.values(PublicPaymentState).map((state) => [
      state,
      describePaymentState(state).tone,
    ]);

    expect(tones.filter(([, tone]) => tone === 'success')).toEqual([
      [PublicPaymentState.Confirmed, 'success'],
    ]);
  });

  it('never allows a new payment while one is pending, settled or under review', () => {
    for (const state of [
      PublicPaymentState.Pending,
      PublicPaymentState.Confirmed,
      PublicPaymentState.RequiresReview,
      PublicPaymentState.Refunded,
    ]) {
      expect(describePaymentState(state).canRetryPayment).toBe(false);
    }
  });

  it('allows a retry after decline, cancellation or when nothing was started', () => {
    for (const state of [
      PublicPaymentState.Declined,
      PublicPaymentState.Cancelled,
      PublicPaymentState.NotStarted,
    ]) {
      expect(describePaymentState(state).canRetryPayment).toBe(true);
    }
  });
});
