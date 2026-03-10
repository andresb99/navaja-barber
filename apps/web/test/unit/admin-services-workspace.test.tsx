import { render, screen } from '@testing-library/react';
import { AdminServicesWorkspace } from '@/components/admin/admin-services-workspace';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('AdminServicesWorkspace', () => {
  it('renders the modern services workspace with catalog sections and related links', () => {
    render(
      <AdminServicesWorkspace
        formAction={async () => {}}
        shopId="shop-1"
        shopSlug="navaja"
        totalServices={3}
        activeServicesCount={2}
        inactiveServicesCount={1}
        averagePriceLabel="$U 783"
        averageDurationLabel="50 min"
        priceRangeLabel="$U 550 a $U 1.050"
        durationSpreadLabel="30 a 75 min"
        topDemandServiceLabel="Corte premium"
        servicesWithDemandCount={2}
        services={[
          {
            id: 'svc-1',
            name: 'Corte premium',
            priceCents: 105000,
            durationMinutes: 75,
            isActive: true,
            recentBookings: 9,
            recentCompleted: 7,
            lastBookedAtLabel: '8 mar',
          },
          {
            id: 'svc-2',
            name: 'Barba express',
            priceCents: 55000,
            durationMinutes: 30,
            isActive: true,
            recentBookings: 3,
            recentCompleted: 2,
            lastBookedAtLabel: '6 mar',
          },
          {
            id: 'svc-3',
            name: 'Afeitado clasico',
            priceCents: 75000,
            durationMinutes: 45,
            isActive: false,
            recentBookings: 1,
            recentCompleted: 1,
            lastBookedAtLabel: '2 mar',
          },
        ]}
      />,
    );

    expect(screen.getByText('Catalogo claro para reservar y mantener')).toBeInTheDocument();
    expect(screen.getByText('Catalogo publicado')).toBeInTheDocument();
    expect(screen.getByText('Servicios ocultos sin perder historial')).toBeInTheDocument();
    expect(screen.getByText('Alta rapida del catalogo')).toBeInTheDocument();
    expect(screen.getByText('Corte premium')).toBeInTheDocument();
    expect(screen.getByText('Afeitado clasico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar servicio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Impacto en citas/i })).toHaveAttribute(
      'href',
      '/admin/appointments?shop=navaja',
    );
  });
});
