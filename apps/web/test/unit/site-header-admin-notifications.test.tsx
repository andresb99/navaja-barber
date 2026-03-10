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

  it('shows the bell entry and requests the admin notification count for the active workspace', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        pending_count: 3,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

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

    expect(screen.getByLabelText('Abrir notificaciones')).toHaveAttribute(
      'href',
      '/admin/notifications?shop=barberandres',
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/workspace/admin/notifications/summary?shop_id=11111111-1111-1111-1111-111111111111',
        expect.objectContaining({
          cache: 'no-store',
        }),
      ),
    );
  });
});
