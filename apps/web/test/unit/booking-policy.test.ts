import { describe, expect, it } from 'vitest';
import {
  describeShopBookingPolicy,
  normalizeShopBookingPolicy,
} from '@/lib/booking-policy';

describe('booking-policy', () => {
  it('normalizes defaults for missing policy values', () => {
    const policy = normalizeShopBookingPolicy(null);

    expect(policy).toEqual({
      cancellationNoticeHours: 6,
      refundMode: 'automatic_full',
      policyText: null,
    });
  });

  it('keeps valid explicit values', () => {
    const policy = normalizeShopBookingPolicy({
      booking_cancellation_notice_hours: 24,
      booking_staff_cancellation_refund_mode: 'manual_review',
      booking_cancellation_policy_text: 'Trae comprobante si hubo devolucion.',
    });

    expect(policy).toEqual({
      cancellationNoticeHours: 24,
      refundMode: 'manual_review',
      policyText: 'Trae comprobante si hubo devolucion.',
    });
    expect(describeShopBookingPolicy(policy).refundLabel).toContain('revision manual');
  });
});
