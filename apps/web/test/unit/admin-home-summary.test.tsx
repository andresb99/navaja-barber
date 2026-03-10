import { render, screen } from '@testing-library/react';
import { AdminHomeSummary } from '@/components/admin/admin-home-summary';

describe('AdminHomeSummary', () => {
  it('renders a concise contextual summary instead of redundant quick links', () => {
    render(
      <AdminHomeSummary
        shopName="Navaja"
        rangeLabel="Hoy"
        revenueLabel="$12.300"
        activeAppointments={9}
        urgentItemsCount={4}
        summaryCards={[
          {
            id: 'next-appointment',
            icon: 'next',
            label: 'Proxima cita',
            headline: '10 mar, 14:30',
            detail: 'Lucia con Andres',
            meta: 'Corte clasico',
          },
          {
            id: 'last-completed-appointment',
            icon: 'completed',
            label: 'Ultima cita realizada',
            headline: 'Camila',
            detail: 'Barba premium con Matias',
            meta: 'Atendida 9 mar, 18:15',
          },
          {
            id: 'latest-review',
            icon: 'review',
            label: 'Ultima resena',
            headline: '4.8 / 5',
            detail: 'Paula dejo feedback reciente.',
            meta: 'Muy buena atencion y puntualidad.',
          },
        ]}
      />,
    );

    expect(screen.getByText('Resumen corto del local')).toBeInTheDocument();
    expect(screen.getByText('Lo ultimo y lo proximo, sin repetir el menu')).toBeInTheDocument();
    expect(screen.getByText('Proxima cita')).toBeInTheDocument();
    expect(screen.getByText('Ultima cita realizada')).toBeInTheDocument();
    expect(screen.getByText('Ultima resena')).toBeInTheDocument();
    expect(screen.getByText('Lucia con Andres')).toBeInTheDocument();
    expect(screen.queryByText('Entra directo a lo que viniste a hacer')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestionar citas')).not.toBeInTheDocument();
    expect(screen.getByText('Facturacion estimada')).toBeInTheDocument();
    expect(screen.getByText('Pendientes urgentes')).toBeInTheDocument();
  });
});
