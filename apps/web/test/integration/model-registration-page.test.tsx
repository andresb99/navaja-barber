import { render, screen } from '@testing-library/react';

describe('ModelRegistrationPage', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the tenant registration page when the request is scoped to a tenant host', async () => {
    const tenantRegistrationPage = vi.fn(async () => <div>Tenant model registration page</div>);

    vi.doMock('@/lib/public-tenant-context', () => ({
      getPublicTenantRouteContext: vi.fn().mockResolvedValue({
        shopId: '11111111-1111-1111-1111-111111111111',
        shopSlug: 'navaja-centro',
        mode: 'platform_subdomain',
      }),
    }));
    vi.doMock('@/lib/modelos', () => ({
      listMarketplaceOpenModelCalls: vi.fn(),
    }));
    vi.doMock('@/app/modelos/[slug]/registro/page', () => ({
      default: tenantRegistrationPage,
      generateMetadata: vi.fn(),
    }));

    const { default: ModelRegistrationPage } = await import('@/app/modelos/registro/page');
    render(
      await ModelRegistrationPage({
        searchParams: Promise.resolve({ session_id: 'session-1' }),
      }),
    );

    expect(screen.getByText('Tenant model registration page')).toBeInTheDocument();
    expect(tenantRegistrationPage).toHaveBeenCalledWith({
      params: expect.any(Promise),
      searchParams: expect.any(Promise),
    });
  });
});
