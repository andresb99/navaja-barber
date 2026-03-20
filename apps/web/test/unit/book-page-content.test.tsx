import { fireEvent, render, screen } from '@testing-library/react';
import { BookPageContent } from '@/components/public/book-page-content';
import { mockMarketplaceShops } from '@/lib/test-fixtures/shops';
import type { MarketplaceShop } from '@/lib/shops';

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
  workingHours: [],
  todayAvailability: 'closed',
};

const shops = [...mockMarketplaceShops, shopWithNoServices];

function getSearchInput() {
  return screen.getByPlaceholderText(/buscar barberia/i);
}

describe('BookPageContent', () => {
  it('renders all shop cards with no filters active', () => {
    render(<BookPageContent shops={shops} />);

    expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
    expect(screen.queryByText(/encontrada/i)).not.toBeInTheDocument();
  });

  describe('inline controls', () => {
    it('shows the search field, date picker and quick filter pills by default', () => {
      render(<BookPageContent shops={shops} />);

      expect(getSearchInput()).toBeInTheDocument();
      expect(screen.getByText(/disponibilidad/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abierto ahora/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verificadas/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /con agenda activa/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /filtros/i })).not.toBeInTheDocument();
    });
  });

  describe('search by text', () => {
    it('filters by shop name', () => {
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

  describe('verified filter', () => {
    it('shows only verified shops', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Pocitos' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Sin Agenda' })).not.toBeInTheDocument();
    });

    it('toggles the verified filter off', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));
      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Pocitos' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Navaja Sin Agenda' })).toBeInTheDocument();
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
    it('applies search and verified filter together', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'navaja' } });
      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Navaja Pocitos' })).not.toBeInTheDocument();
    });

    it('applies verified and active services together', () => {
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

    it('clears all active filters and shows all shops again', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'centro' } });
      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));
      fireEvent.click(screen.getByRole('button', { name: /con agenda activa/i }));

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

    it('shows a verified chip when the verified filter is active', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.click(screen.getByRole('button', { name: /verificadas/i }));

      expect(screen.getAllByText('Verificadas')).toHaveLength(2);
    });
  });

  describe('empty state clear button', () => {
    it('resets all filters from the empty state', () => {
      render(<BookPageContent shops={shops} />);

      fireEvent.change(getSearchInput(), { target: { value: 'xyznonexistent' } });
      expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));

      expect(screen.getByRole('heading', { name: 'Navaja Centro' })).toBeInTheDocument();
      expect(getSearchInput()).toHaveValue('');
    });
  });
});
