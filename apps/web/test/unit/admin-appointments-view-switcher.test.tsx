import { act, fireEvent, render, screen } from '@testing-library/react';
import { AdminAppointmentsViewSwitcher } from '@/components/admin/appointments-view-switcher';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/appointments',
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/components/admin/appointments-table', () => ({
  AdminAppointmentsTable: () => <div data-testid="appointments-table">tabla</div>,
}));

vi.mock('@/components/admin/appointments-cards', () => ({
  AdminAppointmentsCards: () => <div data-testid="appointments-cards">cards</div>,
}));

describe('AdminAppointmentsViewSwitcher', () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it('renders result metadata and table view by default', () => {
    render(
      <AdminAppointmentsViewSwitcher
        shopId="shop-1"
        appointments={[
          {
            id: 'apt-1',
            startAtLabel: '05/03/2026 10:00',
            customerName: 'Juan Perez',
            customerPhone: '+598 91-234-567',
            serviceName: 'Corte',
            staffName: 'Luis',
            sourceChannelLabel: 'Web',
            status: 'pending',
            paymentStatus: 'approved',
            priceLabel: '$890',
          },
        ]}
        initialView="table"
        queryState={{
          shopSlug: 'test1',
          from: '2026-03-01',
          to: '2026-03-31',
          selectedView: 'table',
          page: 1,
          pageSize: 25,
          sortBy: 'start_at',
          sortDir: 'asc',
        }}
        totalAppointments={18}
        currentPageCount={10}
        pageLabel="Pagina 1 de 2"
        activeFilterCount={2}
      />,
    );

    expect(screen.getByText('Agenda filtrada')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 10 de 18 citas. Pagina 1 de 2.')).toBeInTheDocument();
    expect(screen.getByText('2 filtros activos')).toBeInTheDocument();
    expect(screen.getByTestId('appointments-table')).toBeInTheDocument();
  });

  it('switches to cards view and syncs the query string', () => {
    vi.useFakeTimers();

    render(
      <AdminAppointmentsViewSwitcher
        shopId="shop-1"
        appointments={[
          {
            id: 'apt-1',
            startAtLabel: '05/03/2026 10:00',
            customerName: 'Juan Perez',
            customerPhone: '+598 91-234-567',
            serviceName: 'Corte',
            staffName: 'Luis',
            sourceChannelLabel: 'Web',
            status: 'pending',
            paymentStatus: 'approved',
            priceLabel: '$890',
          },
        ]}
        initialView="table"
        queryState={{
          shopSlug: 'test1',
          from: '2026-03-01',
          to: '2026-03-31',
          selectedView: 'table',
          page: 1,
          pageSize: 25,
          sortBy: 'start_at',
          sortDir: 'asc',
        }}
        totalAppointments={18}
        currentPageCount={10}
        pageLabel="Pagina 1 de 2"
        activeFilterCount={0}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cards' }));

    act(() => {
      vi.advanceTimersByTime(160);
    });

    expect(replaceMock).toHaveBeenCalledWith(
      expect.stringContaining('view=cards'),
      { scroll: false },
    );
    expect(screen.getAllByTestId('appointments-cards')).toHaveLength(1);
    expect(screen.queryByTestId('appointments-table')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
