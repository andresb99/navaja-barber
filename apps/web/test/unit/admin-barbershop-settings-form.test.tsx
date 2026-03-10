import { fireEvent, render, screen } from '@testing-library/react';
import { AdminBarbershopSettingsForm } from '@/components/admin/barbershop-settings-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('AdminBarbershopSettingsForm', () => {
  const baseProps = {
    shopId: 'shop-1',
    initialShopName: 'Navaja Club',
    initialShopSlug: 'navaja-club',
    initialTimezone: 'America/Montevideo',
    initialPhone: '+598 99 123 456',
    initialDescription: 'Barberia clasica con foco en cortes y barbas.',
    initialLocationLabel: 'Casa central',
    initialCity: 'Montevideo',
    initialRegion: 'Montevideo',
    initialCountryCode: 'UY',
    initialLatitude: -34.9011,
    initialLongitude: -56.1645,
    initialCoverImageUrl: 'https://example.com/cover.jpg',
    initialBookingCancellationNoticeHours: 6,
    initialBookingRefundMode: 'automatic_full' as const,
    initialBookingPolicyText: 'Cancelaciones hasta 6 horas antes con devolucion total.',
    initialGalleryImages: [
      {
        id: 'img-1',
        publicUrl: 'https://example.com/cover.jpg',
      },
    ],
  };

  it('renders the new sections and public preview links', () => {
    render(<AdminBarbershopSettingsForm {...baseProps} />);

    expect(screen.getByRole('heading', { name: 'Identidad del local' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Perfil publico' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Politicas y friccion del checkout' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Vista previa publica')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver perfil' })).toHaveAttribute(
      'href',
      '/shops/navaja-club',
    );
    expect(screen.getByRole('link', { name: 'Ver reservas' })).toHaveAttribute(
      'href',
      '/shops/navaja-club/book',
    );
  });

  it('updates the public preview links when the slug changes', () => {
    render(<AdminBarbershopSettingsForm {...baseProps} />);

    fireEvent.change(screen.getByLabelText('Slug publico'), {
      target: { value: 'nueva-barberia' },
    });

    expect(screen.getByRole('link', { name: 'Ver perfil' })).toHaveAttribute(
      'href',
      '/shops/nueva-barberia',
    );
    expect(screen.getByRole('link', { name: 'Ver reservas' })).toHaveAttribute(
      'href',
      '/shops/nueva-barberia/book',
    );
  });
});
