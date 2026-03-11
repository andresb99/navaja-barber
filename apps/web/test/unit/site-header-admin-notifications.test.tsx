import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { SiteHeader } from '@/components/public/site-header';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({
    push,
    refresh,
  }),
  useSearchParams: () => new URLSearchParams('shop=barberandres'),
}));

describe('SiteHeader admin notifications', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the bell entry, loads preview items and links to the full notifications page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        pending_count: 3,
        items: [
          {
            id: 'time_off:1',
            kind: 'time_off',
            title: 'Solicitud de ausencia',
            detail: 'Matias · Consulta medica',
            createdAt: '2026-03-10T12:00:00.000Z',
            isNew: true,
          },
          {
            id: 'payment:2',
            kind: 'payment',
            title: 'Pago de reserva pendiente',
            detail: 'Lucia Perez',
            createdAt: '2026-03-09T18:30:00.000Z',
            isNew: false,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(
      <SiteHeader
        initialState={{
          role: 'admin',
          profileName: 'Andre',
          profileAvatarUrl: null,
          userEmail: 'andre@example.com',
          pendingNotificationCount: 0,
          hasWorkspaceAccess: true,
          workspaceDirectory: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              slug: 'barberandres',
              name: 'Barber Andres',
            },
          ],
          isPlatformAdmin: false,
          publicTenantSlug: null,
          publicTenantMode: 'path',
        }}
      />,
    );

    const trigger = screen.getByLabelText('Abrir notificaciones');
    expect(trigger).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button', { name: 'Suscripcion' })
        .some((item) => item.getAttribute('href') === '/suscripcion?shop=barberandres'),
    ).toBe(true);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/workspace/admin/notifications/summary?shop_id=11111111-1111-1111-1111-111111111111',
        expect.objectContaining({
          cache: 'no-store',
        }),
      ),
    );

    await user.click(trigger);

    expect(await screen.findByText('Solicitud de ausencia')).toBeInTheDocument();
    expect(screen.getByText('Pago de reserva pendiente')).toBeInTheDocument();
    expect(screen.getByText('Nueva notificacion')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mas' })).toHaveAttribute(
      'href',
      '/admin/notifications?shop=barberandres',
    );
  });
});
