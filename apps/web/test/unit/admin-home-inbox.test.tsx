import { render, screen } from '@testing-library/react';
import { AdminHomeInbox } from '@/components/admin/admin-home-inbox';

vi.mock('@/app/admin/actions', () => ({
  reviewStaffTimeOffRequestAction: vi.fn(),
}));

describe('AdminHomeInbox', () => {
  it('renders the simplified empty state when there are no urgent items', () => {
    render(
      <AdminHomeInbox
        shopId="shop-1"
        stalePendingIntents={0}
        pendingTimeOffRequests={[]}
        pendingMembershipNotifications={[]}
      />,
    );

    expect(screen.getByText('Solo pendientes accionables')).toBeInTheDocument();
    expect(screen.getByText('Todo al dia')).toBeInTheDocument();
    expect(
      screen.getByText(/No hay acciones urgentes en este momento/i),
    ).toBeInTheDocument();
  });
});
