import { render, screen } from '@testing-library/react';
import { AdminStaffForms } from '@/components/admin/staff-forms';

const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock('@/app/admin/actions', () => ({
  createStaffInvitationsAction: vi.fn(async () => ({
    ok: true,
    message: 'ok',
  })),
  createTimeOffAction: vi.fn(),
  searchStaffInviteeAction: vi.fn(async () => []),
  upsertWorkingHoursRangeAction: vi.fn(),
}));

describe('AdminStaffForms', () => {
  beforeEach(() => {
    refreshMock.mockReset();
  });

  it('renders the modernized sections and disabled states when there is no staff', () => {
    render(
      <AdminStaffForms
        shopId="shop-1"
        shopSlug="test-shop"
        staff={[]}
        weekdays={['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']}
      />,
    );

    expect(screen.getByText('Invitar personal al equipo')).toBeInTheDocument();
    expect(screen.getByText('Horarios laborales')).toBeInTheDocument();
    expect(screen.getByText('Agregar tiempo no disponible')).toBeInTheDocument();
    expect(screen.getByText('Sin lista preparada')).toBeInTheDocument();
    expect(
      screen.getByText('Primero crea al menos un miembro del equipo para asignarle horarios.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Primero crea al menos un miembro del equipo para registrar bloqueos.'),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Guardar invitacion' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Aplicar horario al rango' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agregar bloqueo' })).toBeDisabled();
  });

  it('enables operational forms when there is staff available', () => {
    render(
      <AdminStaffForms
        shopId="shop-1"
        shopSlug="test-shop"
        staff={[{ id: 'staff-1', name: 'Luis' }]}
        weekdays={['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']}
      />,
    );

    expect(screen.queryByText(/Primero crea al menos un miembro del equipo/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aplicar horario al rango' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Agregar bloqueo' })).toBeEnabled();
  });
});
