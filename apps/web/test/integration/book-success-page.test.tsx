import { render, screen } from '@testing-library/react';

describe('BookingSuccessPage', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders an incomplete booking state when no appointment or payment context exists', async () => {
    vi.doMock('@/lib/public-tenant-context', () => ({
      getPublicTenantRouteContext: vi.fn().mockResolvedValue({
        shopId: null,
        shopSlug: null,
        mode: 'path',
      }),
    }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: vi.fn(),
    }));

    const { default: BookingSuccessPage } = await import('@/app/book/success/page');
    render(
      await BookingSuccessPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'No terminaste la reserva',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a intentar' })).toHaveAttribute(
      'href',
      '/book',
    );
  });

  it('keeps tenant-specific actions after a confirmed booking', async () => {
    vi.doMock('@/lib/public-tenant-context', () => ({
      getPublicTenantRouteContext: vi.fn().mockResolvedValue({
        shopId: '11111111-1111-1111-1111-111111111111',
        shopSlug: 'navaja-centro',
        mode: 'path',
      }),
    }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createSupabaseAdminClient: vi.fn(),
    }));

    const { default: BookingSuccessPage } = await import('@/app/book/success/page');
    render(
      await BookingSuccessPage({
        searchParams: Promise.resolve({
          appointment: 'appointment-1',
          start: '2026-03-10T12:00:00.000Z',
          service: 'Corte premium',
          staff: 'Facundo',
          shop: 'navaja-centro',
          shop_name: 'Navaja Centro',
          timezone: 'America/Montevideo',
        }),
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'Reserva confirmada',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agendar otra' })).toHaveAttribute(
      'href',
      '/book/navaja-centro',
    );
    expect(screen.getByRole('button', { name: 'Volver a la barberia' })).toHaveAttribute(
      'href',
      '/shops/navaja-centro',
    );
    expect(screen.getByText('Navaja Centro')).toBeInTheDocument();
    expect(screen.queryByText('2026-03-10T12:00:00.000Z')).not.toBeInTheDocument();
  });
});
