import {
  buildAdminHref,
  buildAppHref,
  buildStaffHref,
  buildTenantAdminHref,
  buildTenantStaffHref,
  buildWorkspaceHref,
} from '@/lib/workspace-routes';

describe('workspace routes', () => {
  it('builds app links and skips empty query values', () => {
    expect(
      buildAppHref('/admin', {
        shop: 'navaja-centro',
        filter: ['today', '', null, 'upcoming'],
        page: 2,
        empty: '   ',
      }),
    ).toBe('/admin?shop=navaja-centro&filter=today&filter=upcoming&page=2');
  });

  it('builds workspace-scoped admin and staff links', () => {
    expect(buildAppHref('/book')).toBe('/book');
    expect(buildAdminHref('/admin/appointments', 'navaja-centro')).toBe(
      '/admin/appointments?shop=navaja-centro',
    );
    expect(buildStaffHref('/staff', null, { view: 'today' })).toBe('/staff?view=today');
    expect(buildWorkspaceHref('/admin', '', { filter: [null, undefined, ''] })).toBe('/admin');
  });

  it('builds tenant workspace links on the shop subdomain when an origin is available', () => {
    const previousRootDomain = process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN;
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    try {
      process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN = 'localhost';
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

      expect(
        buildTenantAdminHref('/admin/appointments', 'navaja-centro', undefined, {
          requestOrigin: 'http://localhost:3000',
        }),
      ).toBe('http://navaja-centro.localhost:3000/admin/appointments');
      expect(
        buildTenantStaffHref('/staff', 'navaja-centro', { view: 'today' }, {
          requestOrigin: 'http://localhost:3000',
        }),
      ).toBe('http://navaja-centro.localhost:3000/staff?view=today');
    } finally {
      process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN = previousRootDomain;
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
  });
});
