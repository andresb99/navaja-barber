import { describe, expect, it } from 'vitest';
import { bookingApiResponseSchema, bookingInputSchema } from '../src/schemas';

describe('booking contracts', () => {
  it('accepts MOBILE as booking input source channel', () => {
    const parsed = bookingInputSchema.safeParse({
      shop_id: '11111111-1111-4111-8111-111111111111',
      service_id: '22222222-2222-4222-8222-222222222222',
      staff_id: '33333333-3333-4333-8333-333333333333',
      start_at: '2026-03-09T18:00:00.000Z',
      source_channel: 'MOBILE',
      customer_name: 'Cliente Mobile',
      customer_phone: '099123456',
      customer_email: 'cliente@example.com',
      notes: null,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.source_channel).toBe('MOBILE');
    }
  });

  it('validates paid booking API responses', () => {
    const parsed = bookingApiResponseSchema.safeParse({
      requires_payment: true,
      payment_intent_id: '44444444-4444-4444-8444-444444444444',
      checkout_url: 'https://checkout.example.com/abc',
    });

    expect(parsed.success).toBe(true);
  });

  it('validates immediate booking API responses', () => {
    const parsed = bookingApiResponseSchema.safeParse({
      requires_payment: false,
      appointment_id: '55555555-5555-4555-8555-555555555555',
      start_at: '2026-03-09T18:00:00.000Z',
    });

    expect(parsed.success).toBe(true);
  });
});
