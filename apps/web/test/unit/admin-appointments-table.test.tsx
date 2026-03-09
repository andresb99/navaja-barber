import { render, screen } from '@testing-library/react';
import { AdminAppointmentsTable } from '@/components/admin/appointments-table';

vi.mock('@/components/admin/appointment-status-form', () => ({
  AdminAppointmentStatusForm: ({
    appointmentId,
    status,
  }: {
    appointmentId: string;
    status: string;
  }) => <div data-testid={`status-form-${appointmentId}`}>{status}</div>,
}));

describe('AdminAppointmentsTable', () => {
  it('renders headers, row data and normalized call link', () => {
    const { container } = render(
      <AdminAppointmentsTable
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
      />,
    );

    expect(screen.getByText('CITA')).toBeInTheDocument();
    expect(screen.getByText('CLIENTE')).toBeInTheDocument();
    expect(screen.getByText('ACCIONES')).toBeInTheDocument();
    expect(screen.getByText('PAGO')).toBeInTheDocument();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(container.querySelector('a[href="tel:+59891234567"]')).not.toBeNull();
  });

  it('renders the empty content when there are no appointments', () => {
    render(<AdminAppointmentsTable shopId="shop-1" appointments={[]} />);

    expect(screen.getByText('No hay citas para los filtros seleccionados.')).toBeInTheDocument();
  });

  it('does not render call link when phone is missing', () => {
    const { container } = render(
      <AdminAppointmentsTable
        shopId="shop-1"
        appointments={[
          {
            id: 'apt-2',
            startAtLabel: '05/03/2026 11:00',
            customerName: 'Ana',
            customerPhone: '',
            serviceName: 'Barba',
            staffName: 'Carlos',
            sourceChannelLabel: 'Presencial',
            status: 'confirmed',
            paymentStatus: null,
            priceLabel: '$490',
          },
        ]}
      />,
    );

    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByText('Sin pago online')).toBeInTheDocument();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
  });
});
