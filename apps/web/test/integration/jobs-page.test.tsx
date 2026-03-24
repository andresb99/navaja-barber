import { render, screen } from '@testing-library/react';
import { mockMarketplaceShops } from '@/lib/test-fixtures/shops';

describe('JobsPage', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the marketplace empty state when there are no active shops', async () => {
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
    expect(screen.getByText(/Aqui se listan barberias activas para enviar un CV directo/i)).toBeInTheDocument();
  });

  it('renders marketplace job targets with direct and fallback metadata', async () => {
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
      '/shops/navaja-pocitos',
    );
  });
});
