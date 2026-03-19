import { fireEvent, render, screen } from '@testing-library/react';
import { BookPageContent } from '@/components/public/book-page-content';
import { mockMarketplaceShops } from '@/lib/test-fixtures/shops';
import type { MarketplaceShop } from '@/lib/shops';

// Navaja Centro: verified, rating 4.8, price 900 cents, 4 active services, city Montevideo
// Navaja Pocitos: not verified, rating 4.4, price 1100 cents, 2 active services, locationLabel Pocitos

const shopWithNoServices: MarketplaceShop = {
  ...mockMarketplaceShops[0]!,
  id: 'no-services-id',
  name: 'Navaja Sin Agenda',
  slug: 'navaja-sin-agenda',
  activeServiceCount: 0,
  minServicePriceCents: null,
  averageRating: null,
  isVerified: false,
  city: 'Salto',
  region: 'Salto',
  locationLabel: 'Centro Salto',
};

const shops = [...mockMarketplaceShops, shopWithNoServices];

// Extra fixture: price above the slider step (5000 cents) for price-range tests
const shopWithHighPrice: MarketplaceShop = {
  ...mockMarketplaceShops[0]!,
  id: 'high-price-id',
  name: 'Navaja Premium',
  slug: 'navaja-premium',
  minServicePriceCents: 600000, // well above step=5000, priceMax becomes 600000
  averageRating: 4.9,
  isVerified: true,
  activeServiceCount: 3,
  city: 'Montevideo',
  region: 'Montevideo',
  locationLabel: 'Pocitos',
};
const shopsWithPriceVariety = [...mockMarketplaceShops, shopWithNoServices, shopWithHighPrice];

function getSearchInput() {
  return screen.getByPlaceholderText(/Busca por nombre o zona/i);
}

/** Open the collapsible filter panel. Must be called before interacting with
 *  rating/verified/services/price filters, which live inside the panel. */
function openFilterPanel() {
  fireEvent.click(screen.getByRole('button', { name: /filtros/i }));
}

describe('BookPageContent', () => {
  it('renders all shop cards with no filters active', () => {
    render(<BookPageContent shops={shops} />);

    expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
    // no result count shown when no filters are active
    expect(screen.queryByText(/encontrada/i)).not.toBeInTheDocument();
  });

  describe('search by text', () => {
    it('filters by shop name (case and accent insensitive)', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'pocitos' } });

      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Centro' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
      expect(screen.getByText(/1 barberia encontrada/i)).toBeInTheDocument();
    });

    it('filters by city', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'salto' } });

      expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Centro' })).not.toBeInTheDocument();
    });

    it('filters by locationLabel', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'centro salto' } });

      expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Pocitos' })).not.toBeInTheDocument();
    });

    it('filters by region', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'salto' } });

      expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Centro' })).not.toBeInTheDocument();
    });

    it('shows empty state when no shops match the query', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'xyznonexistent' } });

      expect(screen.queryByRole('heading', { name: 'Navaja Centro' })).not.toBeInTheDocument();
      expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
      expect(screen.getByText(/proba con otro termino/i)).toBeInTheDocument();
    });

    it('clears the search query via the X button', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'pocitos' } });
      expect(screen.queryByRole('heading', { name: 'Navaja Centro' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /limpiar busqueda/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(getSearchInput()).toHaveValue('');
    });

    it('does not show the X button when the search is empty', () => {
      render(<BookPageContent shops={shops} />);

      expect(screen.queryByRole('button', { name: /limpiar busqueda/i })).not.toBeInTheDocument();
    });
  });

  describe('filter panel', () => {
    it('is closed by default — section labels are not visible', () => {
      render(<BookPageContent shops={shops} />);

      expect(screen.queryByText(/disponibilidad/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/horario/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/otros filtros/i)).not.toBeInTheDocument();
    });

    it('opens when the Filtros button is clicked and shows all sections', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      expect(screen.getByText(/disponibilidad/i)).toBeInTheDocument();
      expect(screen.getByText(/horario/i)).toBeInTheDocument();
      expect(screen.getByText(/otros filtros/i)).toBeInTheDocument();
      expect(screen.getByText(/precio desde/i)).toBeInTheDocument();
    });

    it('shows the DateRangePicker for availability', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      expect(
        screen.getByRole('group', { name: /filtrar por rango de fechas/i }),
      ).toBeInTheDocument();
    });

    it('shows the TimeInput for time filtering', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      expect(
        screen.getByRole('group', { name: /filtrar por horario disponible/i }),
      ).toBeInTheDocument();
    });

    it('shows the price range slider with two thumbs', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      // HeroUI Slider renders two input[type=range] with role="slider" for dual-thumb range
      expect(screen.getAllByRole('slider')).toHaveLength(2);
    });

    it('shows a badge count when filters inside the panel are active', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('Verificadas'));

      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('price range filter', () => {
    // Note: Slider step=5000 cents — values snap to nearest multiple of 5000.
    // shopsWithPriceVariety includes a shop with price 600000 cents (priceMax=600000)
    // so low=5000 reliably excludes Centro (900) + Pocitos (1100) and includes Premium (600000).

    it('filters out null-price shops when the price filter is active', () => {
      render(<BookPageContent shops={shopsWithPriceVariety} />);
      openFilterPanel();

      // Move low thumb to first valid step above 0 → isPriceFiltered = true
      const [lowSlider] = screen.getAllByRole('slider');
      fireEvent.change(lowSlider!, { target: { value: '5000' } });

      // Sin Agenda (null price) must be excluded when any price filter is active
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });

    it('excludes shops whose price is below the low threshold', () => {
      render(<BookPageContent shops={shopsWithPriceVariety} />);
      openFilterPanel();

      // Set low to 5000: Centro (900) + Pocitos (1100) both < 5000 → excluded
      // Premium (600000) >= 5000 → included
      const [lowSlider] = screen.getAllByRole('slider');
      fireEvent.change(lowSlider!, { target: { value: '5000' } });

      expect(screen.getByRole('heading', { name: 'Navaja Premium' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Centro' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Pocitos' })).not.toBeInTheDocument();
    });
  });

  describe('verified filter', () => {
    it('shows only verified shops', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('Verificadas'));

      // Only Centro is verified
      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Pocitos' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });

    it('toggles verified filter off', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('Verificadas'));
      // "Verificadas" now appears in panel + active strip → click panel chip (index 0)
      fireEvent.click(screen.getAllByText('Verificadas')[0]!);

      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
    });
  });

  describe('active services filter', () => {
    it('shows only shops with active services', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('Con agenda activa'));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });
  });

  describe('combined filters', () => {
    it('applies search + verified filter together', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.change(getSearchInput(), { target: { value: 'navaja' } });
      fireEvent.click(screen.getByText('Verificadas'));

      // Only Centro is verified and matches "navaja"
      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Pocitos' })).not.toBeInTheDocument();
    });

    it('applies verified + active services and yields only matching shops', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('Verificadas'));
      fireEvent.click(screen.getByText('Con agenda activa'));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Pocitos' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });
  });

  describe('result count', () => {
    it('shows plural count when multiple results match', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'navaja' } });

      expect(screen.getByText(/3 barberias encontradas/i)).toBeInTheDocument();
    });

    it('shows singular count when exactly one result matches', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'pocitos' } });

      expect(screen.getByText(/1 barberia encontrada/i)).toBeInTheDocument();
    });

    it('shows no-match message when zero results', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'zzznomatch' } });

      expect(screen.getByText(/ninguna barberia coincide/i)).toBeInTheDocument();
    });

    it('hides the count when no filters are active', () => {
      render(<BookPageContent shops={shops} />);

      expect(screen.queryByText(/encontrada/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/ninguna/i)).not.toBeInTheDocument();
    });
  });

  describe('active filters strip', () => {
    it('is hidden when no filters are active', () => {
      render(<BookPageContent shops={shops} />);

      expect(screen.queryByText(/limpiar todo/i)).not.toBeInTheDocument();
    });

    it('appears when at least one filter is active', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'navaja' } });

      expect(screen.getByText(/limpiar todo/i)).toBeInTheDocument();
    });

    it('"Limpiar todo" resets all filters and shows all shops', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.change(getSearchInput(), { target: { value: 'centro' } });
      fireEvent.click(screen.getByText('Verificadas'));
      fireEvent.click(screen.getByText('Con agenda activa'));

      fireEvent.click(screen.getByText(/limpiar todo/i));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
      expect(getSearchInput()).toHaveValue('');
    });

    it('shows a search query chip when text search is active', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'pocitos' } });

      expect(screen.getByText(/"pocitos"/i)).toBeInTheDocument();
    });

    it('shows a verified chip when verified filter is active', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('Verificadas'));

      // "Verificadas" now in panel chip + active strip chip
      expect(screen.getAllByText('Verificadas')).toHaveLength(2);
    });
  });

  describe('empty state "Limpiar filtros" button', () => {
    it('appears in the empty state and resets all filters', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'xyznonexistent' } });
      expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(getSearchInput()).toHaveValue('');
    });
  });
});
