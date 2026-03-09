import {
  getApiRateLimitSubject,
  resolveApiRateLimitPolicy,
} from '@/lib/api-rate-limit';

describe('api rate limit policy resolution', () => {
  it('uses dedicated webhook policy for mercadopago callbacks', () => {
    expect(resolveApiRateLimitPolicy('/api/payments/mercadopago/webhook', 'POST')).toEqual({
      key: 'mercadopago_webhook',
      limit: 180,
      windowSeconds: 60,
      message: 'Demasiadas notificaciones de pago en poco tiempo.',
    });
    expect(resolveApiRateLimitPolicy('/api/payments/mercadopago/webhook', 'GET')).toEqual({
      key: 'mercadopago_webhook',
      limit: 180,
      windowSeconds: 60,
      message: 'Demasiadas notificaciones de pago en poco tiempo.',
    });
  });

  it('uses the public lookup policy for marketplace search endpoints', () => {
    expect(resolveApiRateLimitPolicy('/api/shops/search', 'GET')).toEqual({
      key: 'marketplace_lookup',
      limit: 90,
      windowSeconds: 60,
      message: 'Demasiadas consultas seguidas. Intenta nuevamente en un minuto.',
    });
  });

  it('uses the stricter public submit policy for booking-like writes', () => {
    expect(resolveApiRateLimitPolicy('/api/bookings', 'POST')).toEqual({
      key: 'public_form_submit',
      limit: 12,
      windowSeconds: 600,
      message: 'Demasiados envios en poco tiempo. Espera unos minutos antes de volver a intentar.',
    });
  });
});

describe('api rate limit subject resolution', () => {
  it('prefers the first forwarded ip address', () => {
    const request = {
      headers: new Headers({
        'x-forwarded-for': '203.0.113.10, 198.51.100.20',
        'user-agent': 'Vitest',
      }),
      nextUrl: new URL('https://beardly.com/api/bookings'),
    };

    expect(getApiRateLimitSubject(request as never)).toBe('203.0.113.10');
  });

  it('falls back to hostname and user agent when ip headers are missing', () => {
    const request = {
      headers: new Headers({
        'user-agent': 'Vitest Browser',
      }),
      nextUrl: new URL('http://localhost:3000/api/bookings'),
    };

    expect(getApiRateLimitSubject(request as never)).toBe('localhost:Vitest Browser');
  });
});
