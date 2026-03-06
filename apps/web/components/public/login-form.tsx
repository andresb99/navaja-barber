'use client';

import Link from 'next/link';
import { ChevronRight, LockKeyhole, MailCheck, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button, Input } from '@heroui/react';
import { APP_NAME } from '@/lib/constants';
import { resolveSafeNextPath } from '@/lib/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type AuthMode = 'login' | 'register' | 'recover' | 'reset';
type AuthAction =
  | 'login'
  | 'register'
  | 'magic-link'
  | 'recover'
  | 'reset'
  | 'google'
  | 'facebook';
type SocialProvider = 'google' | 'facebook';

interface LoginFormProps {
  initialMode?: AuthMode;
  nextPath?: string;
  initialMessage?: string | null;
}

export function isEmailValid(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function mapAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Email o contrasena incorrectos.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Debes confirmar tu email antes de ingresar.';
  }

  if (normalized.includes('for security purposes')) {
    return 'Intentaste demasiadas veces. Espera unos minutos e intenta de nuevo.';
  }

  if (normalized.includes('weak password')) {
    return 'La contrasena es muy debil. Usa al menos 8 caracteres.';
  }

  if (normalized.includes('unsupported provider') || normalized.includes('provider is not enabled')) {
    return 'El provider social no esta habilitado en Supabase para este proyecto. Activalo en Authentication > Providers.';
  }

  return message;
}

export function LoginForm({
  initialMode = 'login',
  nextPath = '/cuenta',
  initialMessage = null,
}: LoginFormProps) {
  const safeNextPath = useMemo(() => resolveSafeNextPath(nextPath, '/cuenta'), [nextPath]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeAction, setActiveAction] = useState<AuthAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [hasRecoverySession, setHasRecoverySession] = useState(initialMode !== 'reset');

  useEffect(() => {
    setMode(initialMode);
    setMessage(initialMessage);
  }, [initialMessage, initialMode]);

  useEffect(() => {
    if (mode !== 'reset') {
      setHasRecoverySession(true);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setHasRecoverySession(Boolean(data.session));
      }
    });

    return () => {
      active = false;
    };
  }, [mode, supabase]);

  function beginRequest(action: AuthAction) {
    setActiveAction(action);
    setError(null);
    setMessage(null);
  }

  function completeRequest() {
    setActiveAction(null);
  }

  const isBusy = activeAction !== null;

  function getNetworkAwareError(input: unknown): string {
    if (input instanceof Error && /Failed to fetch/i.test(input.message)) {
      return 'No se pudo conectar con Supabase. Revisa tu conexion y la configuracion del proyecto.';
    }
    if (input instanceof Error) {
      return mapAuthError(input.message);
    }
    return 'Ocurrio un error inesperado.';
  }

  function getPublicOrigin() {
    const { origin, protocol, hostname, port } = window.location;

    if (hostname !== '0.0.0.0') {
      return origin;
    }

    return `${protocol}//localhost${port ? `:${port}` : ''}`;
  }

  function redirectAfterAuthSuccess() {
    window.location.replace(`${getPublicOrigin()}${safeNextPath}`);
  }

  async function loginWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginRequest('login');

    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmailValid(normalizedEmail)) {
      completeRequest();
      setError('Ingresa un email valido.');
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        completeRequest();
        setError(mapAuthError(signInError.message));
        return;
      }

      redirectAfterAuthSuccess();
    } catch (requestError: unknown) {
      completeRequest();
      setError(getNetworkAwareError(requestError));
    }
  }

  async function registerWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginRequest('register');

    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmailValid(normalizedEmail)) {
      completeRequest();
      setError('Ingresa un email valido.');
      return;
    }

    if (password.length < 8) {
      completeRequest();
      setError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    const redirectUrl = `${getPublicOrigin()}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
    const signUpOptions = fullName
      ? { emailRedirectTo: redirectUrl, data: { full_name: fullName.trim() } }
      : { emailRedirectTo: redirectUrl };

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: signUpOptions,
      });

      if (signUpError) {
        completeRequest();
        setError(mapAuthError(signUpError.message));
        return;
      }

      if (data.session && data.user?.id) {
        await supabase.from('user_profiles').upsert(
          {
            auth_user_id: data.user.id,
            full_name: fullName.trim() || null,
          },
          { onConflict: 'auth_user_id' },
        );

        redirectAfterAuthSuccess();
        return;
      }

      completeRequest();
      setMessage('Cuenta creada. Revisa tu correo para confirmar y luego ingresar.');
      setMode('login');
    } catch (requestError: unknown) {
      completeRequest();
      setError(getNetworkAwareError(requestError));
    }
  }

  async function sendMagicLink(event: React.MouseEvent<Element>) {
    event.preventDefault();
    beginRequest('magic-link');

    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmailValid(normalizedEmail)) {
      completeRequest();
      setError('Ingresa un email valido para enviarte el enlace.');
      return;
    }

    const redirectUrl = `${getPublicOrigin()}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: redirectUrl },
      });

      completeRequest();

      if (otpError) {
        setError(mapAuthError(otpError.message));
        return;
      }

      setMessage('Enviamos el enlace magico. Revisa tu correo.');
    } catch (requestError: unknown) {
      completeRequest();
      setError(getNetworkAwareError(requestError));
    }
  }

  async function sendPasswordRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginRequest('recover');

    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmailValid(normalizedEmail)) {
      completeRequest();
      setError('Ingresa un email valido para recuperar tu contrasena.');
      return;
    }

    const resetPath = '/login?mode=reset';
    const redirectUrl = `${getPublicOrigin()}/auth/callback?next=${encodeURIComponent(resetPath)}`;

    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      completeRequest();

      if (recoveryError) {
        setError(mapAuthError(recoveryError.message));
        return;
      }

      setMessage('Te enviamos un enlace para restablecer tu contrasena.');
    } catch (requestError: unknown) {
      completeRequest();
      setError(getNetworkAwareError(requestError));
    }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginRequest('reset');

    if (!hasRecoverySession) {
      completeRequest();
      setError('Tu enlace de recuperacion ya no es valido. Solicita uno nuevo.');
      return;
    }

    if (newPassword.length < 8) {
      completeRequest();
      setError('La nueva contrasena debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      completeRequest();
      setError('La confirmacion no coincide con la nueva contrasena.');
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      completeRequest();

      if (updateError) {
        setError(mapAuthError(updateError.message));
        return;
      }

      setMessage('Contrasena actualizada. Redirigiendo...');
      window.setTimeout(() => {
        redirectAfterAuthSuccess();
      }, 900);
    } catch (requestError: unknown) {
      completeRequest();
      setError(getNetworkAwareError(requestError));
    }
  }

  function getSocialProviderLabel(provider: SocialProvider) {
    return provider === 'google' ? 'Google' : 'Facebook';
  }

  async function signInWithSocialProvider(provider: SocialProvider) {
    beginRequest(provider);

    const redirectUrl = `${getPublicOrigin()}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
    const providerLabel = getSocialProviderLabel(provider);

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          ...(provider === 'google'
            ? {
                queryParams: {
                  access_type: 'offline',
                  prompt: 'select_account',
                },
              }
            : {
                scopes: 'email,public_profile',
              }),
        },
      });

      if (oauthError) {
        completeRequest();
        setError(mapAuthError(oauthError.message));
        return;
      }

      if (!data.url) {
        completeRequest();
        setError(`No se pudo iniciar la autenticacion con ${providerLabel}.`);
      }
    } catch (requestError: unknown) {
      completeRequest();
      setError(getNetworkAwareError(requestError));
    }
  }

  const titleByMode: Record<AuthMode, string> = {
    login: 'Ingresar',
    register: 'Crear cuenta',
    recover: 'Recuperar acceso',
    reset: 'Nueva contrasena',
  };

  const subtitleByMode: Record<AuthMode, string> = {
    login: 'Accede con email y contrasena o recibe un enlace magico.',
    register: 'Crea tu usuario para gestionar tus reservas y datos.',
    recover: 'Enviaremos un enlace para crear una nueva contrasena.',
    reset: 'Define una nueva contrasena para tu cuenta.',
  };

  const isPasswordMode = mode === 'login' || mode === 'register';
  const modeButtonClassName = (isActive: boolean) =>
    `flex min-h-[3.2rem] flex-col items-start justify-center rounded-[1rem] border px-3 py-2 text-left transition ${
      isActive
        ? 'border-sky-300/55 bg-white/90 text-ink shadow-[0_14px_28px_-20px_rgba(14,165,233,0.4)] dark:border-sky-300/35 dark:bg-white/[0.1] dark:text-slate-100'
        : 'border-white/70 bg-white/55 text-slate/80 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300'
    }`;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] xl:gap-6">
      <aside className="section-hero p-6 text-ink md:p-8 dark:text-white">
        <div className="relative z-10 flex h-full flex-col">
          <p className="hero-eyebrow w-fit dark:border-white/10 dark:bg-white/[0.04] dark:text-white/82">
            <Sparkles className="h-3.5 w-3.5" />
            Acceso unificado
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold leading-tight text-ink md:text-4xl dark:text-white">
            {mode === 'reset' ? 'Actualiza tu clave' : `Tu cuenta en ${APP_NAME}`}
          </h1>
          <p className="mt-3 max-w-md text-sm text-slate/80 dark:text-white/80">
            Gestiona reservas, historial y accesos de usuario/staff/admin con una sola autenticacion.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="surface-card rounded-[1.35rem] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/62 dark:text-slate-400">
                Seguridad
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Validacion por correo y recuperacion de clave.
              </p>
            </div>
            <div className="surface-card rounded-[1.35rem] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/62 dark:text-slate-400">
                Continuidad
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Sigue como invitado o entra para guardar historial.
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5 rounded-[1.45rem] border border-white/75 bg-white/58 p-4 text-sm text-slate/85 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/85">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brass" />
              Sesiones protegidas y separacion por rol.
            </li>
            <li className="flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-brass" />
              Confirmacion y recuperacion por email.
            </li>
            <li className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-brass" />
              Perfil conectado a reservas y notificaciones.
            </li>
          </ul>
        </div>
      </aside>

      <div className="soft-panel rounded-[2rem] border-0 p-4 md:p-6">
        <div className="rounded-[1.6rem] border border-white/75 bg-white/66 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              className={modeButtonClassName(mode === 'login')}
              data-testid="auth-mode-login"
              data-active={String(mode === 'login')}
              onClick={() => {
                if (!isBusy) {
                  setMode('login');
                }
              }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate/65 dark:text-slate-400">
                Modo
              </span>
              <span className="mt-1 text-sm font-semibold">Ingresar</span>
            </button>
            <button
              type="button"
              className={modeButtonClassName(mode === 'register')}
              data-testid="auth-mode-register"
              data-active={String(mode === 'register')}
              onClick={() => {
                if (!isBusy) {
                  setMode('register');
                }
              }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate/65 dark:text-slate-400">
                Modo
              </span>
              <span className="mt-1 text-sm font-semibold">Registro</span>
            </button>
            <button
              type="button"
              className={modeButtonClassName(mode === 'recover')}
              data-testid="auth-mode-recover"
              data-active={String(mode === 'recover')}
              onClick={() => {
                if (!isBusy) {
                  setMode('recover');
                }
              }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate/65 dark:text-slate-400">
                Modo
              </span>
              <span className="mt-1 text-sm font-semibold">Recuperar</span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-end">
            <Link href="/book" className="action-secondary inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold">
              Seguir invitado
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <h2 className="mt-5 font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-slate-100">
          {titleByMode[mode]}
        </h2>
        <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">{subtitleByMode[mode]}</p>

        {error ? (
          <p className="status-banner error mt-4" role="alert" aria-live="assertive">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="status-banner success mt-4" role="status" aria-live="polite">
            {message}
          </p>
        ) : null}

        <div key={mode} className="page-enter mt-4 rounded-[1.65rem] border border-white/75 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          {mode === 'recover' ? (
            <form className="space-y-3" onSubmit={sendPasswordRecovery}>
              <Input
                id="recoverEmail"
                type="email"
                label="Email"
                labelPlacement="inside"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Button
                type="submit"
                isLoading={activeAction === 'recover'}
                isDisabled={isBusy}
                className="action-primary px-5 text-sm font-semibold"
              >
                {activeAction === 'recover' ? 'Enviando enlace...' : 'Enviar enlace de recuperacion'}
              </Button>
            </form>
          ) : null}

          {mode === 'reset' ? (
            <form className="space-y-3" onSubmit={updatePassword}>
              {!hasRecoverySession ? (
                <p className="rounded-xl border border-amber-300/70 bg-amber-100/75 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
                  Tu sesion de recuperacion no esta activa. Solicita un nuevo enlace.
                </p>
              ) : null}
              <Input
                id="newPassword"
                type="password"
                label="Nueva contrasena"
                labelPlacement="inside"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
              />
              <Input
                id="confirmPassword"
                type="password"
                label="Confirmar contrasena"
                labelPlacement="inside"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  isLoading={activeAction === 'reset'}
                  isDisabled={isBusy || !hasRecoverySession}
                  className="action-primary px-5 text-sm font-semibold"
                >
                  {activeAction === 'reset' ? 'Actualizando...' : 'Guardar nueva contrasena'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="action-secondary px-5 text-sm font-semibold"
                  onClick={() => {
                    setMode('recover');
                  }}
                  isDisabled={isBusy}
                >
                  Solicitar otro enlace
                </Button>
              </div>
            </form>
          ) : null}

          {isPasswordMode ? (
            <form
              className="space-y-3"
              onSubmit={mode === 'login' ? loginWithPassword : registerWithPassword}
            >
              {mode === 'register' ? (
                <Input
                  id="fullName"
                  label="Nombre y apellido"
                  labelPlacement="inside"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              ) : null}

              <Input
                id="email"
                type="email"
                label="Email"
                labelPlacement="inside"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <div>
                <Input
                  id="password"
                  type="password"
                  label="Contrasena"
                  labelPlacement="inside"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  {...(mode === 'register' ? { minLength: 8 } : {})}
                />
                {mode === 'register' ? (
                  <p className="mt-1 text-xs text-slate/65 dark:text-slate-400">
                    Minimo 8 caracteres.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  isLoading={activeAction === (mode === 'login' ? 'login' : 'register')}
                  isDisabled={isBusy}
                  className="action-primary px-5 text-sm font-semibold"
                >
                  {activeAction === 'login'
                    ? 'Ingresando...'
                    : activeAction === 'register'
                      ? 'Creando cuenta...'
                      : mode === 'login'
                        ? 'Ingresar'
                        : 'Crear cuenta'}
                </Button>
                {mode === 'login' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="action-secondary px-5 text-sm font-semibold"
                    isLoading={activeAction === 'magic-link'}
                    isDisabled={isBusy || !email}
                    onClick={(event) => {
                      void sendMagicLink(event);
                    }}
                  >
                    {activeAction === 'magic-link' ? 'Enviando enlace...' : 'Enlace magico'}
                  </Button>
                ) : null}
              </div>

              <div className="relative py-1">
                <div className="h-px w-full bg-slate-200/90 dark:bg-white/10" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/75 bg-white px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/65 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
                  Social
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="action-secondary w-full justify-center px-5 text-sm font-semibold"
                  isLoading={activeAction === 'google'}
                  isDisabled={isBusy}
                  onClick={() => {
                    void signInWithSocialProvider('google');
                  }}
                >
                  {activeAction === 'google' ? 'Redirigiendo a Google...' : 'Continuar con Google'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="action-secondary w-full justify-center px-5 text-sm font-semibold"
                  isLoading={activeAction === 'facebook'}
                  isDisabled={isBusy}
                  onClick={() => {
                    void signInWithSocialProvider('facebook');
                  }}
                >
                  {activeAction === 'facebook'
                    ? 'Redirigiendo a Facebook...'
                    : 'Continuar con Facebook'}
                </Button>
              </div>

              {mode === 'login' ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate/80 transition-colors md:hover:text-ink dark:text-slate-300 dark:md:hover:text-slate-100"
                  onClick={() => {
                    if (!isBusy) {
                      setMode('recover');
                      setPassword('');
                    }
                  }}
                >
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Olvide mi contrasena
                </button>
              ) : null}
            </form>
          ) : null}
        </div>

        <div className="mt-5 space-y-2 rounded-[1.6rem] border border-white/75 bg-white/62 p-4 dark:border-white/8 dark:bg-white/[0.04]">
          <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-ink dark:text-slate-100">
            Acceso por rol
          </h3>
          <p className="surface-card rounded-xl px-3 py-2 text-sm">
            Invitado: reserva, ve cursos y puede postularse.
          </p>
          <p className="surface-card rounded-xl px-3 py-2 text-sm">
            Usuario: cuenta personal y reservas vinculadas a su email.
          </p>
          <p className="surface-card rounded-xl px-3 py-2 text-sm">
            Staff/Admin: acceso operativo segun permisos internos.
          </p>
        </div>
      </div>
    </div>
  );
}
