import {
  getTenantPublicRewritePath,
  resolveTenantByHost,
  validateCustomDomainActivation,
  validateCustomDomainAssignment,
} from '@/lib/custom-domains';

const platformConfig = {
  appHost: 'beardly.com',
  rootDomain: 'beardly.com',
};

describe('custom domain validation', () => {
  it('allows a Business tenant to save a normalized custom domain', () => {
    const result = validateCustomDomainAssignment({
      requestedDomain: 'https://WWW.NavajaBarber.com/',
      currentShopId: 'shop-1',
      currentPlan: 'business',
      config: platformConfig,
    });

    expect(result).toEqual({
      ok: true,
      message: null,
      normalizedDomain: 'navajabarber.com',
    });
  });

  it('blocks activation for non-Business tenants', () => {
    expect(
      validateCustomDomainActivation({
        currentPlan: 'pro',
        currentDomain: 'navajabarber.com',
      }),
    ).toBe('Solo los tenants Business pueden activar dominios personalizados.');
  });

  it('rejects duplicate domains across tenants', () => {
    const result = validateCustomDomainAssignment({
      requestedDomain: 'www.navajabarber.com',
      currentShopId: 'shop-1',
      currentPlan: 'business',
      existingDomainOwnerShopId: 'shop-2',
      config: platformConfig,
    });

    expect(result).toEqual({
      ok: false,
      message: 'Ese dominio ya esta conectado a otra barberia.',
      normalizedDomain: null,
    });
  });
});

describe('tenant host resolution', () => {
  it('resolves a tenant by custom domain', async () => {
    const lookup = {
      findByCustomDomain: vi.fn().mockResolvedValue({
        shopId: 'shop-1',
        shopSlug: 'navaja',
        shopStatus: 'active',
        plan: 'business',
        subscriptionStatus: 'active',
        domainStatus: 'active',
      }),
      findBySlug: vi.fn().mockResolvedValue(null),
    };

    await expect(
      resolveTenantByHost('https://www.navajabarber.com/', {
        config: platformConfig,
        lookup,
      }),
    ).resolves.toEqual({
      mode: 'custom_domain',
      hostname: 'navajabarber.com',
      shopId: 'shop-1',
      shopSlug: 'navaja',
    });
  });

  it('keeps platform subdomain routing working', async () => {
    const lookup = {
      findByCustomDomain: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue({
        shopId: 'shop-1',
        shopSlug: 'navaja',
        shopStatus: 'active',
        plan: 'free',
        subscriptionStatus: 'active',
        domainStatus: null,
      }),
    };

    await expect(
      resolveTenantByHost('navaja.beardly.com', {
        config: platformConfig,
        lookup,
      }),
    ).resolves.toEqual({
      mode: 'platform_subdomain',
      hostname: 'navaja.beardly.com',
      shopId: 'shop-1',
      shopSlug: 'navaja',
    });
    expect(lookup.findByCustomDomain).not.toHaveBeenCalled();
  });

  it('maps host-scoped public paths back into the existing shop routes', () => {
    expect(getTenantPublicRewritePath('/', 'navaja')).toBe('/shops/navaja');
    expect(getTenantPublicRewritePath('/book', 'navaja')).toBe('/shops/navaja/book');
    expect(getTenantPublicRewritePath('/courses/course-1', 'navaja')).toBe(
      '/shops/navaja/courses/course-1',
    );
  });
});
