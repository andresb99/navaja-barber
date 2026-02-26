'use client';

import Link from 'next/link';
import { LockKeyhole, MailCheck, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resolveSafeNextPath } from '@/lib/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type AuthMode = 'login' | 'register' | 'recover' | 'reset';

interface LoginFormProps {
  initialMode?: AuthMode;
  nextPath?: string;
  initialMessage?: string | null;
}

function isEmailValid(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function mapAuthError(message: string) {
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

  return message;
}

export function LoginForm({ initialMode = 'login', nextPath = '/cuenta', initialMessage = null }: LoginFormProps) {
  const safeNextPath = useMemo(() => resolveSafeNextPath(nextPath, '/cuenta'), [nextPath]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

  function beginRequest() {
    setLoading(true);
    setError(null);
    setMessage(null);
  }

  function completeRequest() {
    setLoading(false);
  }

  function getNetworkAwareError(input: unknown): string {
    if (input instanceof Error && /Failed to fetch/i.test(input.message)) {
      return 'No se pudo conectar con Supabase. Revisa tu conexion y la configuracion del proyecto.';
    }
    if (input instanceof Error) {
      return mapAuthError(input.message);
    }
    return 'Ocurrio un error inesperado.';
  }

  async function loginWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginRequest();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmailValid(normalizedEmail)) {
      completeRequest();
      setError('Ingresa un email valido.');
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      completeRequest();

      if (signInError) {
        setError(mapAuthError(signInError.message));
        return;
      }

      window.location.assign(safeNextPath);
    } catch (requestError: unknown) {
      setLoading(false);
      setError(getNetworkAwareError(requestError));
    }
  }

  async function registerWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginRequest();

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

    const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
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

        completeRequest();
        window.location.assign(safeNextPath);
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

  async function sendMagicLink(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    beginRequest();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmailValid(normalizedEmail)) {
      completeRequest();
      setError('Ingresa un email valido para enviarte el enlace.');
      return;
    }

    const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
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
    beginRequest();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmailValid(normalizedEmail)) {
      completeRequest();
      setError('Ingresa un email valido para recuperar tu contrasena.');
      return;
    }

    const resetPath = '/login?mode=reset';
    const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(resetPath)}`;

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
    beginRequest();

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
        window.location.assign(safeNextPath);
      }, 900);
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

  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <aside className="relative overflow-hidden rounded-3xl border border-white/20 bg-[#07111f] p-6 text-white md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(234,176,72,0.22),transparent_38%),radial-gradient(circle_at_88%_92%,rgba(56,189,248,0.18),transparent_42%)]" />
        <div className="metal-grid absolute inset-0 opacity-20" />
        <div className="relative z-10 space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
            <Sparkles className="h-3.5 w-3.5" />
            Acceso seguro
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold leading-tight md:text-4xl">
            {mode === 'reset' ? 'Actualiza tu clave' : 'Tu cuenta en Navaja'}
          </h1>
          <p className="max-w-sm text-sm text-white/80">
            Controla reservas, historial y accesos por rol desde un solo inicio de sesion.
          </p>

          <ul className="space-y-2 pt-2 text-sm text-white/85">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brass" />
              Sesiones protegidas y por rol.
            </li>
            <li className="flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-brass" />
              Confirmacion y recuperacion por email.
            </li>
            <li className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-brass" />
              Cuenta de usuario conectada a reservas.
            </li>
          </ul>
        </div>
      </aside>

      <div className="soft-panel rounded-3xl border border-white/45 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
              mode === 'login'
                ? 'bg-ink text-white dark:bg-brass dark:text-slate-950'
                : 'bg-slate/10 text-slate/80 dark:bg-slate-800 dark:text-slate-300'
            }`}
            onClick={() => setMode('login')}
          >
            Ingresar
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
              mode === 'register'
                ? 'bg-ink text-white dark:bg-brass dark:text-slate-950'
                : 'bg-slate/10 text-slate/80 dark:bg-slate-800 dark:text-slate-300'
            }`}
            onClick={() => setMode('register')}
          >
            Registro
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
              mode === 'recover'
                ? 'bg-ink text-white dark:bg-brass dark:text-slate-950'
                : 'bg-slate/10 text-slate/80 dark:bg-slate-800 dark:text-slate-300'
            }`}
            onClick={() => setMode('recover')}
          >
            Recuperar
          </button>
          <Button asChild type="button" variant="ghost" size="sm" className="ml-auto">
            <Link href="/book" className="no-underline">
              Seguir invitado
            </Link>
          </Button>
        </div>

        <h2 className="mt-5 font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-slate-100">
          {titleByMode[mode]}
        </h2>
        <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">{subtitleByMode[mode]}</p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-300/70 bg-red-100/75 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-200">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-300/70 bg-emerald-100/75 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-200">
            {message}
          </p>
        ) : null}

        {mode === 'recover' ? (
          <form className="mt-4 space-y-3" onSubmit={sendPasswordRecovery}>
            <div>
              <label htmlFor="recoverEmail">Email</label>
              <Input
                id="recoverEmail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace de recuperacion'}
            </Button>
          </form>
        ) : null}

        {mode === 'reset' ? (
          <form className="mt-4 space-y-3" onSubmit={updatePassword}>
            {!hasRecoverySession ? (
              <p className="rounded-xl border border-amber-300/70 bg-amber-100/75 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
                Tu sesion de recuperacion no esta activa. Solicita un nuevo enlace.
              </p>
            ) : null}
            <div>
              <label htmlFor="newPassword">Nueva contrasena</label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirmar contrasena</label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading || !hasRecoverySession}>
                {loading ? 'Actualizando...' : 'Guardar nueva contrasena'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setMode('recover');
                }}
                disabled={loading}
              >
                Solicitar otro enlace
              </Button>
            </div>
          </form>
        ) : null}

        {isPasswordMode ? (
          <form className="mt-4 space-y-3" onSubmit={mode === 'login' ? loginWithPassword : registerWithPassword}>
            {mode === 'register' ? (
            <div>
              <label htmlFor="fullName">Nombre y apellido</label>
              <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
          ) : null}

          <div>
            <label htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

            <div>
              <label htmlFor="password">Contrasena</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={mode === 'register' ? 8 : undefined}
              />
              {mode === 'register' ? (
                <p className="mt-1 text-xs text-slate/65 dark:text-slate-400">Minimo 8 caracteres.</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Procesando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </Button>
              {mode === 'login' ? (
                <Button type="button" variant="ghost" disabled={loading || !email} onClick={sendMagicLink}>
                  Enlace magico
                </Button>
              ) : null}
            </div>

            {mode === 'login' ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate/80 transition-colors hover:text-ink dark:text-slate-300 dark:hover:text-slate-100"
                onClick={() => {
                  setMode('recover');
                  setPassword('');
                }}
              >
                <LockKeyhole className="h-3.5 w-3.5" />
                Olvide mi contrasena
              </button>
            ) : null}
          </form>
        ) : null}

        <div className="mt-6 space-y-2 rounded-2xl border border-white/40 bg-white/65 p-4 dark:border-slate-700 dark:bg-slate-900/70">
          <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-ink dark:text-slate-100">
            Acceso por rol
          </h3>
          <p className="rounded-lg border border-white/50 bg-white/70 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/65">
            Invitado: reserva, ve cursos y puede postularse.
          </p>
          <p className="rounded-lg border border-white/50 bg-white/70 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/65">
            Usuario: cuenta personal y reservas vinculadas a su email.
          </p>
          <p className="rounded-lg border border-white/50 bg-white/70 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/65">
            Staff/Admin: acceso operativo segun permisos internos.
          </p>
        </div>
      </div>
    </div>
  );
}
