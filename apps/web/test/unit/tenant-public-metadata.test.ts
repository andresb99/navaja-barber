import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';

describe('tenant public metadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('points canonical metadata to the active custom domain', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beardly.com');
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN', 'beardly.com');

    const metadata = buildTenantPageMetadata({
      shop: {
        slug: 'navaja',
        customDomain: 'www.navajabarber.com',
        domainStatus: 'active',
        plan: 'business',
        subscriptionStatus: 'active',
      },
      title: 'Navaja',
      description: 'Perfil publico',
      section: 'profile',
    });

    expect(metadata.alternates?.canonical).toBe('https://navajabarber.com/');
    expect(metadata.openGraph?.url).toBe('https://navajabarber.com/');
  });

  it('marks transactional pages as noindex when requested', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beardly.com');
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN', 'beardly.com');

    const metadata = buildTenantPageMetadata({
      shop: {
        slug: 'navaja',
        plan: 'free',
        subscriptionStatus: 'active',
      },
      title: 'Reservar',
      description: 'Booking page',
      section: 'book',
      noIndex: true,
    });

    expect(metadata.alternates?.canonical).toBe('https://navaja.beardly.com/book');
    expect(metadata.robots).toEqual({
      index: false,
      follow: true,
    });
  });
});
