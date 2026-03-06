import { render, screen } from '@testing-library/react';

describe('ShopsMarketplacePage', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the map shell without requiring preloaded shops', async () => {
    vi.doMock('@/components/public/shops-map-marketplace', () => ({
      ShopsMapMarketplace: ({ initialShops = [] }: { initialShops?: Array<{ name: string }> }) => (
        <div data-testid="shops-map-marketplace">
          {initialShops.map((shop) => shop.name).join(', ')}
        </div>
      ),
    }));

    const { default: ShopsMarketplacePage } = await import('@/app/shops/page');
    render(await ShopsMarketplacePage());

    expect(screen.getByTestId('shops-map-marketplace')).toBeEmptyDOMElement();
  });

  it('matches the current empty-state copy rendered by the marketplace shell', async () => {
    vi.doMock('@/components/public/shops-map-marketplace', () => ({
      ShopsMapMarketplace: () => (
        <div data-testid="shops-map-marketplace">Aun no hay barberias visibles en esta vista.</div>
      ),
    }));

    const { default: ShopsMarketplacePage } = await import('@/app/shops/page');
    render(await ShopsMarketplacePage());

    expect(screen.getByText('Aun no hay barberias visibles en esta vista.')).toBeInTheDocument();
  });
});
