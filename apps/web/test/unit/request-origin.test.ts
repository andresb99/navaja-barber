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

  it('returns null from header-only origin resolution when fallback url is empty', () => {
    const headerStore = new Headers();

    expect(getRequestOriginFromHeaders(headerStore, null)).toBeNull();
  });

  it('ignores invalid fallback urls when building an origin from headers', () => {
    const headerStore = new Headers();

    expect(getRequestOriginFromHeaders(headerStore, 'not-a-valid-url')).toBeNull();
  });

  it('accepts URL objects as fallback origins', () => {
    const headerStore = new Headers({
      host: '0.0.0.0:3010',
    });

    expect(getRequestOriginFromHeaders(headerStore, new URL('https://beardly.test/admin'))).toBe(
      'https://localhost:3010',
    );
  });

  it('builds an origin without a fallback when the host header is present', () => {
    const headerStore = new Headers({
      host: '0.0.0.0:3020',
    });

    expect(getRequestOriginFromHeaders(headerStore, null)).toBe('http://localhost:3020');
  });

  it('falls back to null when NEXT_PUBLIC_APP_URL is not set and no host is present', () => {
    const previousValue = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getRequestOriginFromHeaders(new Headers())).toBeNull();

    if (previousValue === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previousValue;
    }
  });
});
