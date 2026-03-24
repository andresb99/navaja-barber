import { render, screen, within } from '@testing-library/react';
import { mockMarketplaceShops } from '@/lib/test-fixtures/shops';

describe('BookPage', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders shop cards when marketplace shops are available', async () => {
    const shops = [
      ...mockMarketplaceShops,
      {
        ...mockMarketplaceShops[0],
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Navaja Interior',
        slug: 'navaja-interior',
        isVerified: false,
        description: null,
        city: null,
        region: null,
        minServicePriceCents: null,
      },
    ];

    vi.doMock('@/lib/shops', () => ({
      listMarketplaceShops: vi.fn().mockResolvedValue(shops),
    }));

    const { default: BookPage } = await import('@/app/book/page');
    render(await BookPage());

    expect(
      screen.getByRole('heading', {
        name: /Selecciona una barberia y entra a su agenda/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Agendar aqui' })[0]).toHaveAttribute(
      'href',
      '/book/navaja-centro',
    );
    const interiorCard = screen.getByRole('heading', { name: 'Navaja Interior' }).closest('article');

    expect(interiorCard).not.toBeNull();
    expect(within(interiorCard as HTMLElement).getByText('Uruguay')).toBeInTheDocument();
    expect(
      within(interiorCard as HTMLElement).getByText(
        'Servicios, staff y horarios cargados dentro de su propio workspace.',
      ),
    ).toBeInTheDocument();
    expect(within(interiorCard as HTMLElement).getByText('Sin precio')).toBeInTheDocument();
  });

  it('renders the empty state when no marketplace shops exist', async () => {
    vi.doMock('@/lib/shops', () => ({
      listMarketplaceShops: vi.fn().mockResolvedValue([]),
    }));

    const { default: BookPage } = await import('@/app/book/page');
    render(await BookPage());

    expect(
      screen.getByRole('heading', {
        name: 'Elige una barberia antes de agendar',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al marketplace' })).toHaveAttribute(
      'href',
      '/shops',
    );
  });
});
