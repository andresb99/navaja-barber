import { render, screen } from '@testing-library/react';
import { AdminNotificationsWorkspace } from '@/components/admin/admin-notifications-workspace';

vi.mock('@/app/admin/actions', () => ({
  reviewStaffTimeOffRequestAction: vi.fn(),
}));

describe('AdminNotificationsWorkspace', () => {
  it('renders actionable notifications with the new admin inbox structure', () => {
    render(
      <AdminNotificationsWorkspace
        shopId="shop-1"
        shopName="Barber Andres"
        shopSlug="barberandres"
        shopTimezone="America/Montevideo"
        pendingMembershipNotifications={[
          {
            id: 'membership-1',
            profileName: 'Lucia Perez',
            role: 'staff',
            createdAt: '2026-03-10T12:00:00.000Z',
          },
        ]}
        pendingTimeOffRequests={[
          {
            id: 'time-off-1',
            staffName: 'Matias',
            startAt: '10 mar, 14:00',
            endAt: '10 mar, 18:00',
            reason: 'Consulta medica',
            createdAt: '2026-03-10T11:30:00.000Z',
          },
        ]}
        pendingMembershipCount={1}
        pendingTimeOffCount={1}
        stalePendingIntents={2}
        totalCount={4}
      />,
    );

    expect(screen.getByText('Inbox operativo del local')).toBeInTheDocument();
    expect(screen.getByText('Resuelve primero lo operativo')).toBeInTheDocument();
    expect(screen.getByText('Solicitud de ausencia')).toBeInTheDocument();
    expect(screen.getByText('Invitacion pendiente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprobar ausencia' })).toBeInTheDocument();
    expect(screen.getByText('Hay 2 checkouts que conviene revisar antes de que el cliente abandone la reserva.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a citas' })).toHaveAttribute(
      'href',
      '/admin/appointments?shop=barberandres',
    );
  });

  it('renders the empty state when there are no notifications', () => {
    render(
      <AdminNotificationsWorkspace
        shopId="shop-1"
        shopName="Barber Andres"
        shopSlug="barberandres"
        shopTimezone="America/Montevideo"
        pendingMembershipNotifications={[]}
        pendingTimeOffRequests={[]}
        pendingMembershipCount={0}
        pendingTimeOffCount={0}
        stalePendingIntents={0}
        totalCount={0}
      />,
    );

    expect(screen.getByText('No hay alertas activas en este momento')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al resumen' })).toHaveAttribute(
      'href',
      '/admin?shop=barberandres',
    );
  });
});
