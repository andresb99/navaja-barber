import { render, screen } from '@testing-library/react';

describe('ModelosLandingPage', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the no-open-calls state when there are no active model sessions', async () => {
    vi.doMock('@/lib/modelos', () => ({
      listMarketplaceOpenModelCalls: vi.fn().mockResolvedValue([]),
    }));

    const { default: ModelosLandingPage } = await import('@/app/modelos/page');
    render(await ModelosLandingPage());

    expect(screen.getByText(/Todavia no hay convocatorias abiertas/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear mi perfil' })).toHaveAttribute(
      'href',
      '/modelos/registro',
    );
  });

  it('renders marketplace calls with all compensation and fallback variants', async () => {
    vi.doMock('@/lib/modelos', () => ({
      listMarketplaceOpenModelCalls: vi.fn().mockResolvedValue([
        {
          session_id: 'session-1',
          shop_id: 'shop-1',
          shop_name: 'Navaja Centro',
          shop_slug: 'navaja-centro',
          course_title: 'Corte clasico',
          start_at: '2026-03-10T15:00:00.000Z',
          location: 'Montevideo',
          compensation_type: 'gratis',
          compensation_value_cents: null,
          notes_public: 'Trae referencia visual.',
          models_needed: 2,
          model_categories: ['Cabello largo', 'Coloracion'],
        },
        {
          session_id: 'session-2',
          shop_id: 'shop-2',
          shop_name: 'Navaja Pocitos',
          shop_slug: 'navaja-pocitos',
          course_title: 'Fade avanzado',
          start_at: '2026-03-11T15:00:00.000Z',
          location: 'Pocitos',
          compensation_type: 'pago',
          compensation_value_cents: 5000,
          notes_public: null,
          models_needed: 0,
          model_categories: [],
        },
        {
          session_id: 'session-3',
          shop_id: 'shop-3',
          shop_name: 'Navaja Prado',
          shop_slug: 'navaja-prado',
          course_title: 'Texturas',
          start_at: '2026-03-12T15:00:00.000Z',
          location: 'Prado',
          compensation_type: 'descuento',
          compensation_value_cents: null,
          notes_public: 'Solo cabello medio o largo.',
          models_needed: 1,
          model_categories: null,
        },
      ]),
    }));

    const { default: ModelosLandingPage } = await import('@/app/modelos/page');
    render(await ModelosLandingPage());

    expect(
      screen.getByRole('heading', {
        name: /Postulate a convocatorias abiertas de distintas barberias/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Corte clasico' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fade avanzado' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Texturas' })).toBeInTheDocument();
    expect(screen.getByText('Gratis')).toBeInTheDocument();
    expect(screen.getByText(/\$\s?50\b/)).toBeInTheDocument();
    expect(screen.getByText('descuento')).toBeInTheDocument();
    expect(screen.getByText('Cupos: 2')).toBeInTheDocument();
    expect(screen.getByText('Cupos: Sin definir')).toBeInTheDocument();
    expect(screen.getByText('Trae referencia visual.')).toBeInTheDocument();
    expect(screen.getAllByText('Cabello largo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Coloracion').length).toBeGreaterThan(0);
    expect(screen.getByText('Sin notas publicas.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Postularme' })[0]).toHaveAttribute(
      'href',
      '/modelos/navaja-centro/registro?session_id=session-1',
    );
    expect(screen.getAllByRole('link', { name: 'Ver barberia' })[2]).toHaveAttribute(
      'href',
      'http://navaja-prado.localhost:3000/modelos',
    );
  });
});
