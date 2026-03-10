import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMercadoPagoServerEnvMock, fetchMock } = vi.hoisted(() => ({
  getMercadoPagoServerEnvMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('@/lib/env.server', () => ({
  getMercadoPagoServerEnv: getMercadoPagoServerEnvMock,
}));

import { createMercadoPagoCheckoutPreference } from '@/lib/mercado-pago.server';

describe('mercado-pago.server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMercadoPagoServerEnvMock.mockReturnValue({
      MERCADO_PAGO_ACCESS_TOKEN: 'platform-token',
      MERCADO_PAGO_API_BASE_URL: null,
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('uses sandbox init point when OAuth-connected seller is flagged as test mode', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      async json() {
        return {
          id: 'pref-1',
          init_point: 'https://mercadopago.com.uy/checkout/v1/redirect?pref_id=pref-1',
          sandbox_init_point: 'https://sandbox.mercadopago.com.uy/checkout/v1/redirect?pref_id=pref-1',
        };
      },
    });

    const result = await createMercadoPagoCheckoutPreference(
      {
        item: {
          id: 'service-1',
          title: 'Reserva',
          amountCents: 40000,
        },
        payerEmail: 'test_user_6274659370633756481@testuser.com',
        externalReference: 'booking-ref',
        successUrl: 'https://beardly.vercel.app/book/success',
        pendingUrl: 'https://beardly.vercel.app/book/success',
        failureUrl: 'https://beardly.vercel.app/book/success',
        notificationUrl: 'https://beardly.vercel.app/api/payments/mercadopago/webhook',
      },
      {
        accessToken: 'APP_USR-oauth-token',
        testMode: true,
      },
    );

    expect(result.checkoutUrl).toBe(
      'https://sandbox.mercadopago.com.uy/checkout/v1/redirect?pref_id=pref-1',
    );
  });
});
