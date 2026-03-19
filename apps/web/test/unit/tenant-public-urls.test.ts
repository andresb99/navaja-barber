import {
  buildCanonicalRedirectUrlFromLegacyPath,
  buildTenantCanonicalHref,
} from '@/lib/tenant-public-urls';

describe('tenant public urls', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers the active custom domain as the canonical public url', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beardly.com');
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN', 'beardly.com');

    expect(
      buildTenantCanonicalHref(
        {
          slug: 'navaja',
          customDomain: 'www.navajabarber.com',
          domainStatus: 'active',
          plan: 'business',
          subscriptionStatus: 'active',
        },
        'book',
        {
          requestOrigin: 'https://beardly.com',
        },
      ),
    ).toBe('https://navajabarber.com/book');
  });

  it('uses the platform subdomain when no active custom domain is available', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beardly.com');
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN', 'beardly.com');

    expect(
      buildTenantCanonicalHref(
        {
          slug: 'navaja',
          plan: 'free',
          subscriptionStatus: 'active',
        },
        'profile',
        {
          requestOrigin: 'https://beardly.com',
        },
      ),
    ).toBe('https://navaja.beardly.com/');
  });

  it('keeps the legacy shop path on vercel preview hosts', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beardly.com');
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN', 'beardly.com');

    expect(
      buildTenantCanonicalHref(
        {
          slug: 'navaja',
          customDomain: 'navajabarber.com',
          domainStatus: 'active',
          plan: 'business',
          subscriptionStatus: 'active',
        },
        'book',
        {
          requestOrigin: 'https://navaja-git-feature-123.vercel.app',
        },
      ),
    ).toBe('/book/navaja');
  });

  it('redirects legacy public shop paths to the canonical host url', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN', 'localhost');

    expect(
      buildCanonicalRedirectUrlFromLegacyPath({
        pathname: '/shops/navaja/book',
        search: '?from=marketplace',
        requestOrigin: 'http://localhost:3000',
        shop: {
          slug: 'navaja',
          plan: 'free',
          subscriptionStatus: 'active',
        },
      }),
    ).toBe('http://navaja.localhost:3000/book?from=marketplace');
  });
});
