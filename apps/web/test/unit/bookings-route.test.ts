import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createMercadoPagoCheckoutPreferenceMock,
  createAppointmentFromBookingIntentMock,
  getMercadoPagoServerEnvMock,
  trackProductEventMock,
  getRequestOriginMock,
  readSanitizedJsonBodyMock,
  getShopMercadoPagoCredentialsMock,
  createSupabaseAdminClientMock,
  createSupabaseServerClientMock,
} = vi.hoisted(() => ({
  createMercadoPagoCheckoutPreferenceMock: vi.fn(),
  createAppointmentFromBookingIntentMock: vi.fn(),
  getMercadoPagoServerEnvMock: vi.fn(),
  trackProductEventMock: vi.fn(),
  getRequestOriginMock: vi.fn(),
  readSanitizedJsonBodyMock: vi.fn(),
  getShopMercadoPagoCredentialsMock: vi.fn(),
  createSupabaseAdminClientMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
}));

vi.mock('@/lib/booking-payments.server', () => ({
  createAppointmentFromBookingIntent: createAppointmentFromBookingIntentMock,
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_APP_URL: 'https://beardly.vercel.app',
  },
}));

vi.mock('@/lib/env.server', () => ({
  getMercadoPagoServerEnv: getMercadoPagoServerEnvMock,
}));

vi.mock('@/lib/mercado-pago.server', async () => {
  const actual = await vi.importActual<typeof import('@/lib/mercado-pago.server')>('@/lib/mercado-pago.server');
  return {
    ...actual,
    createMercadoPagoCheckoutPreference: createMercadoPagoCheckoutPreferenceMock,
  };
});

vi.mock('@/lib/product-analytics', () => ({
  trackProductEvent: trackProductEventMock,
}));

vi.mock('@/lib/request-origin', () => ({
  getRequestOrigin: getRequestOriginMock,
}));

vi.mock('@/lib/sanitize', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sanitize')>('@/lib/sanitize');
  return {
    ...actual,
    readSanitizedJsonBody: readSanitizedJsonBodyMock,
  };
});

vi.mock('@/lib/shop-payment-accounts.server', () => ({
  getShopMercadoPagoCredentials: getShopMercadoPagoCredentialsMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

import { POST } from '@/app/api/bookings/route';

function createSelectBuilder(data: unknown) {
  const builder: {
    eq: () => typeof builder;
    maybeSingle: () => Promise<{ data: unknown; error: null }>;
  } = {
    eq() {
      return builder;
    },
    async maybeSingle() {
      return { data, error: null };
    },
  };

  return builder;
}

function createInsertBuilder(insertResult: unknown) {
  return {
    select() {
      return {
        async single() {
          return { data: insertResult, error: null };
        },
      };
    },
  };
}

function createUpdateBuilder() {
  const builder: {
    eq: () => Promise<{ data: null; error: null }>;
  } = {
    async eq() {
      return { data: null, error: null };
    },
  };

  return builder;
}

describe('bookings route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAppointmentFromBookingIntentMock.mockResolvedValue(null);
    trackProductEventMock.mockResolvedValue(undefined);
    getMercadoPagoServerEnvMock.mockReturnValue({
      MERCADO_PAGO_WEBHOOK_TOKEN: 'webhook-token',
      MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret',
    });
    getRequestOriginMock.mockReturnValue('https://beardly.vercel.app');
    readSanitizedJsonBodyMock.mockResolvedValue({
      shop_id: '11111111-1111-4111-8111-111111111111',
      service_id: '22222222-2222-4222-8222-222222222222',
      staff_id: '33333333-3333-4333-8333-333333333333',
      start_at: '2026-03-10T12:00:00.000Z',
      source_channel: 'WEB',
      pay_in_store: false,
      customer_name: 'Cliente Test',
      customer_phone: '099111222',
      customer_email: 'test_user_6274659370633756481@testuser.com',
      notes: null,
    });
    getShopMercadoPagoCredentialsMock.mockResolvedValue({
      paymentAccountId: 'payment-account-1',
      providerEmail: 'test_user_2320140438075208725@testuser.com',
      providerNickname: 'TESTUSER2320140438075208725',
      accessToken: 'TEST-merchant-token',
    });
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        async getUser() {
          return { data: { user: null } };
        },
      },
    });
    createSupabaseAdminClientMock.mockReturnValue({
      from(table: string) {
        if (table === 'shops') {
          return {
            select: () => createSelectBuilder({ id: '11111111-1111-4111-8111-111111111111', status: 'active' }),
          };
        }
        if (table === 'services') {
          return {
            select: () =>
              createSelectBuilder({
                id: '22222222-2222-4222-8222-222222222222',
                name: 'Corte',
                price_cents: 40000,
              }),
          };
        }
        if (table === 'staff') {
          return {
            select: () => createSelectBuilder({ id: '33333333-3333-4333-8333-333333333333', name: 'Facundo' }),
          };
        }
        if (table === 'payment_intents') {
          return {
            insert: () => createInsertBuilder({ id: 'intent-1' }),
            update: () => createUpdateBuilder(),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    });
    createMercadoPagoCheckoutPreferenceMock.mockResolvedValue({
      preferenceId: 'pref-1',
      checkoutUrl: 'https://mercadopago.com.uy/checkout/v1/redirect?pref_id=pref-1',
    });
  });

  it('sends the buyer test email to Mercado Pago when shop checkout runs in test mode', async () => {
    const request = new Request('https://beardly.vercel.app/api/bookings', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request as never);

    expect(response.status).toBe(200);
    expect(createMercadoPagoCheckoutPreferenceMock).toHaveBeenCalledTimes(1);
    expect(createMercadoPagoCheckoutPreferenceMock.mock.calls[0]?.[0]).toMatchObject({
      payerEmail: 'test_user_6274659370633756481@testuser.com',
    });
    expect(createMercadoPagoCheckoutPreferenceMock.mock.calls[0]?.[1]).toMatchObject({
      testMode: true,
    });
  });
});
