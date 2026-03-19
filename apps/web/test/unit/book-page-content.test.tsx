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

  describe('rating filter', () => {
    it('toggles 4+ stars filter on and off', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /4\+ estrellas/i }));

      // Centro (4.8) and Pocitos (4.4) pass; Sin Agenda (null) does not
      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();

      // toggle off → all back
      fireEvent.click(screen.getByRole('button', { name: /4\+ estrellas/i }));
      expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
    });

    it('applies 3+ stars filter', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /3\+ estrellas/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });

    it('switches between rating chips without stacking', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /4\+ estrellas/i }));
      fireEvent.click(screen.getByRole('button', { name: /3\+ estrellas/i }));

      // 3+ is now active, 4+ should be cleared — Pocitos (4.4) still passes
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });
  });

  describe('price filter', () => {
    it('filters by hasta $500 (50000 cents)', () => {
      render(<BookPageContent shops={shops} />);

      // Centro price is 900 cents (<= 50000 ✓); Pocitos is 1100 cents (<= 50000 ✓); Sin Agenda has null
      fireEvent.click(screen.getByRole('button', { name: /hasta \$500/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });

    it('filters by hasta $1500 (150000 cents)', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /hasta \$1\.500/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });

    it('toggles price filter off when clicked again', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /hasta \$500/i }));
      fireEvent.click(screen.getByRole('button', { name: /hasta \$500/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
    });
  });

  describe('verified filter', () => {
    it('shows only verified shops', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));

      // Only Centro is verified
      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Pocitos' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });

    it('toggles verified filter off', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));
      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
    });
  });

  describe('active services filter', () => {
    it('shows only shops with active services', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /con agenda activa/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });
  });

  describe('combined filters', () => {
    it('applies search + rating together', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'montevideo' } });
      fireEvent.click(screen.getByRole('button', { name: /4\+ estrellas/i }));

      // Centro (4.8, Montevideo) ✓ — Pocitos (4.4, Montevideo) ✓ — Sin Agenda (null) excluded
      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
    });

    it('applies verified + active services and yields only matching shops', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));
      fireEvent.click(screen.getByRole('button', { name: /con agenda activa/i }));

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

  describe('"Limpiar filtros" button', () => {
    it('is hidden when no filters are active', () => {
      render(<BookPageContent shops={shops} />);

      expect(screen.queryByRole('button', { name: /limpiar filtros/i })).not.toBeInTheDocument();
    });

    it('appears when at least one filter is active', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));

      expect(screen.getByRole('button', { name: /limpiar filtros/i })).toBeInTheDocument();
    });

    it('resets all filters and shows all shops', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'centro' } });
      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));
      fireEvent.click(screen.getByRole('button', { name: /4\+ estrellas/i }));

      // Trigger the clear from the filter row (first occurrence)
      fireEvent.click(screen.getAllByRole('button', { name: /limpiar filtros/i })[0]!);

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
      expect(getSearchInput()).toHaveValue('');
    });

    it('empty state clear button also resets all filters', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'xyznonexistent' } });

      // When the empty state is visible there are two "Limpiar filtros" buttons:
      // [0] in the filter chip row, [1] inside the empty-state panel — both call clearAll
      const clearButtons = screen.getAllByRole('button', { name: /limpiar filtros/i });
      expect(clearButtons).toHaveLength(2);
      fireEvent.click(clearButtons[1]!);

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(getSearchInput()).toHaveValue('');
    });
  });
});
