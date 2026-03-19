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

      expect(screen.queryByText(/calificaci.n m.nima/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/otros filtros/i)).not.toBeInTheDocument();
    });

    it('opens when the Filtros button is clicked', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      expect(screen.getByText(/calificaci.n m.nima/i)).toBeInTheDocument();
      expect(screen.getByText(/otros filtros/i)).toBeInTheDocument();
    });

    it('shows a badge count when filters inside the panel are active', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('Verificadas'));

      // The badge "1" should now be visible inside the Filtros button
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('rating filter', () => {
    it('filters to shops with 4+ stars', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('4+ estrellas'));

      // Centro (4.8) and Pocitos (4.4) pass; Sin Agenda (null) does not
      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });

    it('applies 3+ stars filter', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('3+ estrellas'));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });

    it('toggles 4+ stars filter off, restoring all shops', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      // Activate
      fireEvent.click(screen.getByText('4+ estrellas'));
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();

      // Deactivate by clicking the panel chip again (index 0 = panel chip, index 1 = active strip chip)
      fireEvent.click(screen.getAllByText(/4\+ estrellas/i)[0]!);
      expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
    });

    it('switches between rating chips without stacking', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('4+ estrellas'));
      // Now switch to 3+: "3+ estrellas" only appears once (in panel) at this point
      fireEvent.click(screen.getByText('3+ estrellas'));

      // 3+ is active — Pocitos (4.4) still passes
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });
  });

  describe('price range filter', () => {
    it('filters out null-price shops when any price range is active', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      // Move low thumb above zero → price filter becomes active
      const [lowSlider] = screen.getAllByRole('slider');
      fireEvent.change(lowSlider!, { target: { value: '200' } });

      // Sin Agenda has null price — must be excluded when price filter is active
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });

    it('excludes shops whose price is below the low threshold', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      // Set low price to 1000 cents → Centro (900) excluded, Pocitos (1100) included
      const [lowSlider] = screen.getAllByRole('slider');
      fireEvent.change(lowSlider!, { target: { value: '1000' } });

      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Centro' })).not.toBeInTheDocument();
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
    it('applies search + rating together', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.change(getSearchInput(), { target: { value: 'montevideo' } });
      fireEvent.click(screen.getByText('4+ estrellas'));

      // Centro (4.8, Montevideo) ✓ — Pocitos (4.4, Montevideo) ✓ — Sin Agenda (null) excluded
      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
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
      fireEvent.click(screen.getByText('4+ estrellas'));

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

    it('shows a rating chip when a rating filter is active', () => {
      render(<BookPageContent shops={shops} />);
      openFilterPanel();

      fireEvent.click(screen.getByText('4+ estrellas'));

      // "4+ estrellas" chip should now appear in the active strip
      expect(screen.getAllByText(/4\+ estrellas/i)).toHaveLength(2); // panel + strip
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
