import { render, screen } from '@testing-library/react';
import { mockMarketplaceShops } from '@/lib/test-fixtures/shops';

interface CourseRow {
  id: string;
  shop_id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_hours: number;
  level: string;
}

function mockCoursesClient(courses: CourseRow[] | null) {
  const query = {
    select: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockResolvedValue({ data: courses });

  return {
    from: vi.fn().mockReturnValue(query),
  };
}

describe('CoursesPage', () => {
  const primaryShop = mockMarketplaceShops[0]!;

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the tenant courses page when the request is scoped to a tenant host', async () => {
    const tenantCoursesPage = vi.fn(async () => <div>Tenant courses page</div>);

    vi.doMock('@/lib/public-tenant-context', () => ({
      getPublicTenantRouteContext: vi.fn().mockResolvedValue({
        shopId: primaryShop.id,
        shopSlug: primaryShop.slug,
        mode: 'platform_subdomain',
      }),
    }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: vi.fn(),
    }));
    vi.doMock('@/app/shops/[slug]/courses/page', () => ({
      default: tenantCoursesPage,
      generateMetadata: vi.fn(),
    }));

    const { default: CoursesPage } = await import('@/app/courses/page');
    render(await CoursesPage());

    expect(screen.getByText('Tenant courses page')).toBeInTheDocument();
    expect(tenantCoursesPage).toHaveBeenCalledWith({
      params: expect.any(Promise),
    });
  });

  it('renders the marketplace empty state when there are no active shops', async () => {
    vi.doMock('@/lib/public-tenant-context', () => ({
      getPublicTenantRouteContext: vi.fn().mockResolvedValue({
        shopId: null,
        shopSlug: null,
        mode: 'path',
      }),
    }));
    vi.doMock('@/lib/shops', () => ({
      listMarketplaceShops: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: vi.fn(() => mockCoursesClient(null)),
    }));

    const { default: CoursesPage } = await import('@/app/courses/page');
    render(await CoursesPage());

    expect(
      screen.getByRole('heading', {
        name: 'Aqui deberia vivir el catalogo global de formacion',
      }),
    ).toBeInTheDocument();
  });

  it('renders the no-courses state when no active course rows are returned', async () => {
    vi.doMock('@/lib/public-tenant-context', () => ({
      getPublicTenantRouteContext: vi.fn().mockResolvedValue({
        shopId: null,
        shopSlug: null,
        mode: 'path',
      }),
    }));
    vi.doMock('@/lib/shops', () => ({
      listMarketplaceShops: vi.fn().mockResolvedValue([primaryShop]),
    }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: vi.fn(() => mockCoursesClient(null)),
    }));

    const { default: CoursesPage } = await import('@/app/courses/page');
    render(await CoursesPage());

    expect(screen.getByText('Todavia no hay cursos activos publicados.')).toBeInTheDocument();
  });

  it('renders global course cards and filters out rows for unknown shops', async () => {
    vi.doMock('@/lib/public-tenant-context', () => ({
      getPublicTenantRouteContext: vi.fn().mockResolvedValue({
        shopId: null,
        shopSlug: null,
        mode: 'path',
      }),
    }));
    vi.doMock('@/lib/shops', () => ({
      listMarketplaceShops: vi.fn().mockResolvedValue([primaryShop]),
    }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: vi.fn(() =>
        mockCoursesClient([
          {
            id: 'course-1',
            shop_id: primaryShop.id,
            title: 'Fade Pro',
            description: 'Tecnicas de degradado y precision.',
            price_cents: 5000,
            duration_hours: 6,
            level: 'Intermedio',
          },
          {
            id: 'course-orphan',
            shop_id: '99999999-9999-9999-9999-999999999999',
            title: 'Orphan',
            description: 'No deberia mostrarse',
            price_cents: 1000,
            duration_hours: 1,
            level: 'Basico',
          },
        ]),
      ),
    }));

    const { default: CoursesPage } = await import('@/app/courses/page');
    render(await CoursesPage());

    expect(
      screen.getByRole('heading', {
        name: /Todos los cursos activos en un solo catalogo/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fade Pro' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Orphan' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Intermedio').length).toBeGreaterThan(0);
    expect(screen.getByText('6h')).toBeInTheDocument();
    expect(screen.getByText(/\$\s?50\b/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver curso' })).toHaveAttribute(
      'href',
      '/courses/course-1',
    );
    expect(screen.getByRole('link', { name: 'Ver academia' })).toHaveAttribute(
      'href',
      '/shops/navaja-centro/courses',
    );
  });
});
