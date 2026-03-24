import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/public/login-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: null,
        },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
    from: () => ({
      upsert: vi.fn(),
    }),
  }),
}));

describe('LoginForm', () => {
  it('switches between auth modes without losing the auth shell', async () => {
    const user = userEvent.setup();

    render(<LoginForm initialMode="login" />);

    expect(screen.getByRole('heading', { name: 'Bienvenido de vuelta' })).toBeInTheDocument();

    await user.click(screen.getByTestId('auth-mode-register'));

    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre y apellido')).toBeInTheDocument();

    await user.click(screen.getByTestId('auth-mode-login'));
    await user.click(screen.getByRole('button', { name: 'Olvide mi contrasena' }));

    expect(screen.getByRole('heading', { name: 'Recuperar acceso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar enlace de recuperacion' })).toBeInTheDocument();
  });

  it('renders the initial async status message in an accessible live region', () => {
    render(
      <LoginForm
        initialMode="login"
        initialMessage="Cuenta creada. Revisa tu correo para confirmar y luego ingresar."
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Cuenta creada. Revisa tu correo para confirmar y luego ingresar.',
    );
  });
});
