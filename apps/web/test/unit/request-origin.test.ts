import { getRequestOrigin, getRequestOriginFromHeaders } from '@/lib/request-origin';

describe('getRequestOrigin', () => {
  it('prefers forwarded headers and normalizes 0.0.0.0', () => {
    const request = {
      url: 'http://0.0.0.0:3000/admin',
      headers: new Headers({
        host: '0.0.0.0:3000',
        'x-forwarded-host': '0.0.0.0:4000',
        'x-forwarded-proto': 'https',
      }),
    };

    expect(getRequestOrigin(request as never)).toBe('https://localhost:4000');
  });

  it('falls back to the request url when host headers are missing', () => {
    const request = {
      url: 'http://0.0.0.0:3000/staff',
      headers: new Headers(),
    };

    expect(getRequestOrigin(request as never)).toBe('http://localhost:3000');
  });

  it('uses the request protocol and preserves regular hostnames', () => {
    const request = {
      url: 'https://navaja.test/admin',
      headers: new Headers({
        host: 'navaja.test',
      }),
    };

    expect(getRequestOrigin(request as never)).toBe('https://navaja.test');
  });

  it('falls back to the request hostname when the host header omits it', () => {
    const request = {
      url: 'https://navaja.test/admin',
      headers: new Headers({
        host: ':3000',
      }),
    };

    expect(getRequestOrigin(request as never)).toBe('https://navaja.test:3000');
  });

  it('builds an origin from a header store for server components', () => {
    const headerStore = new Headers({
      host: 'navaja.localhost:3000',
      'x-forwarded-proto': 'http',
    });

    expect(getRequestOriginFromHeaders(headerStore)).toBe('http://navaja.localhost:3000');
  });
});
