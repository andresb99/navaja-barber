import { render, screen } from '@testing-library/react';
import { MercadoPagoSettingsPanel } from '@/components/admin/mercadopago-settings-panel';

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

describe('MercadoPagoSettingsPanel', () => {
  it('renders error messages with the correct banner tone', () => {
    render(
      <MercadoPagoSettingsPanel
        shopSlug="navaja"
        timeZone="America/Montevideo"
        account={null}
        message={{
          text: 'No se pudo conectar Mercado Pago. Verifica la configuracion OAuth y vuelve a intentar.',
          tone: 'error',
        }}
      />,
    );

    expect(screen.getByText(/No se pudo conectar Mercado Pago/i)).toHaveClass(
      'status-banner',
      'error',
    );
    expect(
      screen.getByRole('link', { name: /Conectar Mercado Pago/i }),
    ).toHaveAttribute('href', '/api/admin/payments/mercadopago/connect?shop=navaja');
  });
});
