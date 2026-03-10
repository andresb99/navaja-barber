import { afterEach, describe, expect, it, vi } from 'vitest';

describe('shop-payment-accounts.server', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates and verifies a signed Mercado Pago connect state', async () => {
    vi.stubEnv('MERCADO_PAGO_APP_ID', '123456789');
    vi.stubEnv('MERCADO_PAGO_CLIENT_SECRET', 'super-secret-client');
    vi.stubEnv('MERCADO_PAGO_OAUTH_REDIRECT_URI', 'https://beardly.app/api/admin/payments/mercadopago/callback');
    vi.stubEnv('SHOP_PAYMENT_ACCOUNT_CRYPTO_SECRET', '0123456789abcdef0123456789abcdef');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key-long-enough-for-tests');

    const {
      createMercadoPagoConnectState,
      verifyMercadoPagoConnectState,
    } = await import('@/lib/shop-payment-accounts.server');

    const state = createMercadoPagoConnectState({
      shopId: 'shop-1',
      shopSlug: 'barberia-centro',
      actorUserId: 'user-1',
    });

    expect(verifyMercadoPagoConnectState(state)).toMatchObject({
      shopId: 'shop-1',
      shopSlug: 'barberia-centro',
      actorUserId: 'user-1',
    });
  });

  it('builds the Mercado Pago OAuth authorization url for the shop country', async () => {
    vi.stubEnv('MERCADO_PAGO_APP_ID', '123456789');
    vi.stubEnv('MERCADO_PAGO_CLIENT_SECRET', 'super-secret-client');
    vi.stubEnv('MERCADO_PAGO_OAUTH_REDIRECT_URI', 'https://beardly.app/api/admin/payments/mercadopago/callback');
    vi.stubEnv('SHOP_PAYMENT_ACCOUNT_CRYPTO_SECRET', '0123456789abcdef0123456789abcdef');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key-long-enough-for-tests');

    const { buildMercadoPagoOAuthAuthorizationUrl } = await import('@/lib/shop-payment-accounts.server');

    const url = new URL(
      buildMercadoPagoOAuthAuthorizationUrl({
        state: 'signed-state',
        countryCode: 'UY',
      }),
    );

    expect(url.origin).toBe('https://auth.mercadopago.com.uy');
    expect(url.pathname).toBe('/authorization');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('123456789');
    expect(url.searchParams.get('platform_id')).toBe('mp');
    expect(url.searchParams.get('state')).toBe('signed-state');
  });

  it('normalizes legacy mercadolibre oauth hosts to mercadopago', async () => {
    vi.stubEnv('MERCADO_PAGO_APP_ID', '123456789');
    vi.stubEnv('MERCADO_PAGO_CLIENT_SECRET', 'super-secret-client');
    vi.stubEnv('MERCADO_PAGO_OAUTH_REDIRECT_URI', 'https://beardly.app/api/admin/payments/mercadopago/callback');
    vi.stubEnv('MERCADO_PAGO_OAUTH_AUTH_BASE_URL', 'https://auth.mercadolibre.com.uy');
    vi.stubEnv('SHOP_PAYMENT_ACCOUNT_CRYPTO_SECRET', '0123456789abcdef0123456789abcdef');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key-long-enough-for-tests');

    const { buildMercadoPagoOAuthAuthorizationUrl } = await import('@/lib/shop-payment-accounts.server');

    const url = new URL(
      buildMercadoPagoOAuthAuthorizationUrl({
        state: 'signed-state',
        countryCode: 'UY',
      }),
    );

    expect(url.origin).toBe('https://auth.mercadopago.com.uy');
  });
});
