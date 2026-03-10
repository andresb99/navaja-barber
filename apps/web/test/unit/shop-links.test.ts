import {
  buildShopHref,
  buildTenantCourseHref,
  buildTenantModelRegistrationHref,
  buildTenantPublicHref,
  normalizeShopSlug,
} from '@/lib/shop-links';

describe('shop links', () => {
  it('normalizes arbitrary shop names into slugs', () => {
    expect(normalizeShopSlug('  Navaja & Barber  ')).toBe('navaja-barber');
  });

  it('builds shop links with optional sections', () => {
    expect(buildShopHref('Navaja Centro')).toBe('/shops/navaja-centro');
    expect(buildShopHref('Navaja Centro', 'book')).toBe('/shops/navaja-centro/book');
  });

  it('builds host-scoped tenant links when the request already resolved the shop by host', () => {
    expect(buildTenantPublicHref('navaja-centro', 'custom_domain')).toBe('/');
    expect(buildTenantPublicHref('navaja-centro', 'platform_subdomain', 'jobs')).toBe('/jobs');
    expect(buildTenantCourseHref('navaja-centro', 'course-1', 'path')).toBe(
      '/shops/navaja-centro/courses/course-1',
    );
    expect(buildTenantCourseHref('navaja-centro', 'course-1', 'custom_domain')).toBe(
      '/courses/course-1',
    );
    expect(buildTenantCourseHref('navaja-centro', '', 'path')).toBe('/shops/navaja-centro/courses');
  });

  it('builds model registration links with and without session ids', () => {
    expect(buildTenantModelRegistrationHref('Navaja Centro', 'path')).toBe(
      '/shops/navaja-centro/modelos/registro',
    );
    expect(
      buildTenantModelRegistrationHref('Navaja Centro', 'custom_domain', ' session 1/2 '),
    ).toBe('/modelos/registro?session_id=session%201%2F2');
  });
});
