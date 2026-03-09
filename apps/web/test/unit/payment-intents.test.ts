import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAppointmentFromBookingIntentMock,
  createCourseEnrollmentFromIntentMock,
  getMercadoPagoPaymentMock,
  searchLatestMercadoPagoPaymentByExternalReferenceMock,
  trackProductEventMock,
  createSupabaseAdminClientMock,
} = vi.hoisted(() => ({
  createAppointmentFromBookingIntentMock: vi.fn(),
  createCourseEnrollmentFromIntentMock: vi.fn(),
  getMercadoPagoPaymentMock: vi.fn(),
  searchLatestMercadoPagoPaymentByExternalReferenceMock: vi.fn(),
  trackProductEventMock: vi.fn(),
  createSupabaseAdminClientMock: vi.fn(),
}));

vi.mock('@/lib/booking-payments.server', () => ({
  createAppointmentFromBookingIntent: createAppointmentFromBookingIntentMock,
}));

vi.mock('@/lib/course-payments.server', () => ({
  createCourseEnrollmentFromIntent: createCourseEnrollmentFromIntentMock,
}));

vi.mock('@/lib/mercado-pago.server', () => ({
  getMercadoPagoPayment: getMercadoPagoPaymentMock,
  searchLatestMercadoPagoPaymentByExternalReference: searchLatestMercadoPagoPaymentByExternalReferenceMock,
}));

vi.mock('@/lib/product-analytics', () => ({
  trackProductEvent: trackProductEventMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

import {
  mapMercadoPagoStatus,
  processMercadoPagoPaymentWebhook,
  reconcileMercadoPagoPaymentIntents,
} from '@/lib/payment-intents.server';

function createSelectBuilder(config: {
  single?: unknown;
  list?: unknown[];
}) {
  const filters: Record<string, unknown> = {};
  const builder: {
    eq: (field: string, value: unknown) => typeof builder;
    in: (field: string, value: unknown) => typeof builder;
    order: () => typeof builder;
    limit: () => typeof builder;
    maybeSingle: () => Promise<{ data: unknown; error: null }>;
    then: (
      resolve: (value: { data: unknown[]; error: null }) => unknown,
      reject?: (reason?: unknown) => unknown,
    ) => Promise<unknown>;
  } = {
    eq(field, value) {
      filters[field] = value;
      return builder;
    },
    in(field, value) {
      filters[field] = value;
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    async maybeSingle() {
      return {
        data: typeof config.single === 'function' ? (config.single as (filters: Record<string, unknown>) => unknown)(filters) : config.single,
        error: null,
      };
    },
    then(resolve, reject) {
      return Promise.resolve({
        data: typeof config.list === 'function' ? (config.list as (filters: Record<string, unknown>) => unknown[])(filters) : config.list || [],
        error: null,
      }).then(resolve, reject);
    },
  };

  return builder;
}

function createUpdateBuilder(updateLog: Array<{ payload: Record<string, unknown>; filters: Record<string, unknown> }>, payload: Record<string, unknown>) {
  const entry = {
    payload,
    filters: {} as Record<string, unknown>,
  };
  updateLog.push(entry);

  const builder: {
    eq: (field: string, value: unknown) => typeof builder;
    in: (field: string, value: unknown) => typeof builder;
    then: (
      resolve: (value: { data: null; error: null }) => unknown,
      reject?: (reason?: unknown) => unknown,
    ) => Promise<unknown>;
  } = {
    eq(field, value) {
      entry.filters[field] = value;
      return builder;
    },
    in(field, value) {
      entry.filters[field] = value;
      return builder;
    },
    then(resolve, reject) {
      return Promise.resolve({ data: null, error: null }).then(resolve, reject);
    },
  };

  return builder;
}

function createAdminClientMock(options: {
  singlePaymentIntent?: unknown;
  listPaymentIntents?: unknown[];
}) {
  const updates: Array<{ payload: Record<string, unknown>; filters: Record<string, unknown> }> = [];

  createSupabaseAdminClientMock.mockReturnValue({
    from: (table: string) => {
      if (table !== 'payment_intents' && table !== 'subscriptions') {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select: () =>
          createSelectBuilder({
            single: options.singlePaymentIntent,
            list: options.listPaymentIntents || [],
          }),
        update: (payload: Record<string, unknown>) => createUpdateBuilder(updates, payload),
      };
    },
  });

  return updates;
}

describe('payment-intents.server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAppointmentFromBookingIntentMock.mockResolvedValue({
      appointmentId: 'appointment-1',
      startAt: '2026-03-09T09:00:00.000Z',
      customerId: 'customer-1',
    });
    createCourseEnrollmentFromIntentMock.mockResolvedValue({
      enrollmentId: 'enrollment-1',
      sessionId: 'session-1',
    });
    trackProductEventMock.mockResolvedValue(undefined);
  });

  it('maps Mercado Pago statuses into internal statuses', () => {
    expect(mapMercadoPagoStatus('approved')).toBe('approved');
    expect(mapMercadoPagoStatus('pending')).toBe('processing');
    expect(mapMercadoPagoStatus('in_process')).toBe('processing');
    expect(mapMercadoPagoStatus('charged_back')).toBe('refunded');
    expect(mapMercadoPagoStatus('cancelled')).toBe('cancelled');
  });

  it('processes an approved booking payment webhook and marks the intent as processed', async () => {
    const updates = createAdminClientMock({
      singlePaymentIntent: {
        id: 'intent-1',
        shop_id: 'shop-1',
        intent_type: 'booking',
        status: 'pending',
        external_reference: 'booking-shop-1-abc',
        processed_at: null,
        provider_payment_id: null,
        created_by_user_id: 'user-1',
        payload: {
          shop_id: 'shop-1',
          service_id: 'service-1',
          staff_id: 'staff-1',
          start_at: '2026-03-09T09:00:00.000Z',
          customer_name: 'Cliente',
          customer_phone: '099000000',
          customer_email: 'cliente@testuser.com',
          notes: null,
          created_by_user_email: 'cliente@testuser.com',
        },
      },
    });
    getMercadoPagoPaymentMock.mockResolvedValue({
      id: 149523944098,
      status: 'approved',
      external_reference: 'booking-shop-1-abc',
      payer: { email: 'cliente@testuser.com' },
    });

    const result = await processMercadoPagoPaymentWebhook('149523944098');

    expect(result).toMatchObject({
      ok: true,
      status: 'approved',
      paymentIntentId: 'intent-1',
      providerPaymentId: '149523944098',
    });
    expect(createAppointmentFromBookingIntentMock).toHaveBeenCalledTimes(1);
    expect(updates).toHaveLength(2);
    expect(updates[0]?.payload.status).toBe('approved');
    expect(updates[1]?.payload.status).toBe('approved');
    expect(updates[1]?.payload.processed_at).toBeTruthy();
  });

  it('reconciles pending intents by searching Mercado Pago with the external reference', async () => {
    const updates = createAdminClientMock({
      listPaymentIntents: [
        {
          id: 'intent-2',
          shop_id: 'shop-1',
          intent_type: 'booking',
          status: 'pending',
          external_reference: 'booking-shop-1-reconcile',
          processed_at: null,
          provider_payment_id: null,
          created_by_user_id: 'user-2',
          payload: {
            shop_id: 'shop-1',
            service_id: 'service-2',
            staff_id: 'staff-2',
            start_at: '2026-03-09T10:00:00.000Z',
            customer_name: 'Cliente 2',
            customer_phone: '098000000',
            customer_email: 'cliente2@testuser.com',
            notes: null,
          },
        },
      ],
    });
    searchLatestMercadoPagoPaymentByExternalReferenceMock.mockResolvedValue({
      id: 149523955555,
      status: 'approved',
      external_reference: 'booking-shop-1-reconcile',
      payer: { email: 'cliente2@testuser.com' },
    });

    const result = await reconcileMercadoPagoPaymentIntents({ limit: 10 });

    expect(searchLatestMercadoPagoPaymentByExternalReferenceMock).toHaveBeenCalledWith(
      'booking-shop-1-reconcile',
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ok: true,
      status: 'approved',
      paymentIntentId: 'intent-2',
    });
    expect(updates[1]?.payload.processed_at).toBeTruthy();
  });
});
