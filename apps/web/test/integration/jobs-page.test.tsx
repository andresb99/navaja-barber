import { render, screen } from '@testing-library/react';
import { mockMarketplaceShops } from '@/lib/test-fixtures/shops';

describe('JobsPage', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the tenant jobs page when the request is scoped to a tenant host', async () => {
    const tenantJobsPage = vi.fn(async () => <div>Tenant jobs page</div>);

    vi.doMock('@/lib/public-tenant-context', () => ({
      getPublicTenantRouteContext: vi.fn().mockResolvedValue({
        shopId: '11111111-1111-1111-1111-111111111111',
        shopSlug: 'navaja-centro',
        mode: 'platform_subdomain',
      }),
    }));
    vi.doMock('@/app/jobs/[slug]/page', () => ({
      default: tenantJobsPage,
      generateMetadata: vi.fn(),
    }));

    const { default: JobsPage } = await import('@/app/jobs/page');
    render(await JobsPage());

    expect(screen.getByText('Tenant jobs page')).toBeInTheDocument();
    expect(tenantJobsPage).toHaveBeenCalledWith({
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

    const { default: JobsPage } = await import('@/app/jobs/page');
    render(await JobsPage());

    expect(
      screen.getByRole('heading', {
        name: 'Esta ruta deberia centralizar postulaciones del marketplace',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Aqui se listan barberias activas para enviar un CV directo/i),
    ).toBeInTheDocument();
  });

  it('renders marketplace job targets with direct and fallback metadata', async () => {
    vi.doMock('@/lib/public-tenant-context', () => ({
      getPublicTenantRouteContext: vi.fn().mockResolvedValue({
        shopId: null,
        shopSlug: null,
        mode: 'path',
      }),
    }));
    vi.doMock('@/lib/shops', () => ({
      listMarketplaceShops: vi.fn().mockResolvedValue([
        mockMarketplaceShops[0],
        {
          ...mockMarketplaceShops[1],
          city: null,
          region: null,
          description: null,
        },
      ]),
    }));

    const { default: JobsPage } = await import('@/app/jobs/page');
    render(await JobsPage());

    expect(
      screen.getByRole('heading', {
        name: /Postulate a una barberia o deja tu CV en la bolsa general/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
    expect(screen.getByText('Navaja Centro - Montevideo')).toBeInTheDocument();
    expect(screen.getByText('Uruguay')).toBeInTheDocument();
    expect(
      screen.getByText('Postulate directo al pipeline privado de esta barberia.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Enviar CV directo' })[0]).toHaveAttribute(
      'href',
      '/jobs/navaja-centro',
    );
    expect(screen.getAllByRole('link', { name: 'Ver barberia' })[1]).toHaveAttribute(
      'href',
      'http://navaja-pocitos.localhost:3000/',
    );
  });
});
