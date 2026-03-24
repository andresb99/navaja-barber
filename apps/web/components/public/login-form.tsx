'use client';

import Link from 'next/link';
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  LogIn,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input } from '@heroui/react';
import { APP_NAME } from '@/lib/constants';
import { resolveSafeNextPath } from '@/lib/navigation';
import {
  getMaxAnnualSavingsPercent,
  getSubscriptionPlanDescriptor,
  type SubscriptionBillingMode,
  PUBLIC_MARKETPLACE_PLANS,
} from '@/lib/subscription-plans';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type AuthMode = 'login' | 'register' | 'recover' | 'reset';
type AuthAction = 'login' | 'register' | 'magic-link' | 'recover' | 'reset' | 'google' | 'facebook';
type SocialProvider = 'google' | 'facebook';
type MarketplacePlanId = (typeof PUBLIC_MARKETPLACE_PLANS)[number];

interface LoginFormProps {
  initialMode?: AuthMode;
  nextPath?: string;
  initialMessage?: string | null;
}

const UYU_FORMATTER = new Intl.NumberFormat('es-UY', {
  style: 'currency',
  currency: 'UYU',
  maximumFractionDigits: 0,
});

function formatUyuCents(amountCents: number) {
  return UYU_FORMATTER.format(Math.round(amountCents / 100));
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

  if (
    normalized.includes('unsupported provider') ||
    normalized.includes('provider is not enabled')
  ) {
    return 'El provider social no esta habilitado en Supabase para este proyecto. Activalo en Authentication > Providers.';
  }

  return message;
}

function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-9 w-7 items-center justify-center text-slate/40 transition-colors hover:text-slate/70 focus:outline-none dark:text-zinc-500 dark:hover:text-zinc-300"
      aria-label={visible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

export function LoginForm({
  initialMode = 'login',
  nextPath = '/',
  initialMessage = null,
}: LoginFormProps) {
  const safeNextPath = useMemo(() => resolveSafeNextPath(nextPath, '/'), [nextPath]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeAction, setActiveAction] = useState<AuthAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [hasRecoverySession, setHasRecoverySession] = useState(initialMode !== 'reset');
  const [billingMode, setBillingMode] = useState<SubscriptionBillingMode>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<MarketplacePlanId>('pro');
  const [planSelectionIntent, setPlanSelectionIntent] = useState<{
    planId: MarketplacePlanId;
    billingMode: SubscriptionBillingMode;
  } | null>(null);

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

  function getPlanOnboardingPath(planId: MarketplacePlanId, mode: SubscriptionBillingMode) {
    const query = new URLSearchParams({
      plan: planId,
      billing: mode,
    });
    return `/onboarding/barbershop?${query.toString()}`;
  }

  function getPostAuthNextPath() {
    if (!planSelectionIntent) {
      return safeNextPath;
    }

    return getPlanOnboardingPath(planSelectionIntent.planId, planSelectionIntent.billingMode);
  }

  function redirectAfterAuthSuccess() {
    window.location.replace(`${getPublicOrigin()}${getPostAuthNextPath()}`);
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

    const redirectUrl = `${getPublicOrigin()}/auth/callback?next=${encodeURIComponent(getPostAuthNextPath())}`;
    const signUpOptions = {
      emailRedirectTo: redirectUrl,
      data: {
        ...(fullName ? { full_name: fullName.trim() } : {}),
        selected_plan: (planSelectionIntent?.planId || selectedPlanId) as string,
        selected_billing_mode: (planSelectionIntent?.billingMode || billingMode) as string,
      },
    };

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

    const redirectUrl = `${getPublicOrigin()}/auth/callback?next=${encodeURIComponent(getPostAuthNextPath())}`;
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

    const redirectUrl = `${getPublicOrigin()}/auth/callback?next=${encodeURIComponent(getPostAuthNextPath())}`;
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
    login: 'Bienvenido de vuelta',
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

  const showPlans = mode === 'register';
  const isPasswordMode = mode === 'login' || mode === 'register';
  const selectedPlan = useMemo(
    () => getSubscriptionPlanDescriptor(selectedPlanId),
    [selectedPlanId],
  );
  const selectedPlanFeatures = useMemo(() => selectedPlan?.features || [], [selectedPlan]);
  const planOptions = useMemo(
    () =>
      PUBLIC_MARKETPLACE_PLANS.map((planId) => {
        const plan = getSubscriptionPlanDescriptor(planId);
        const isSelected = selectedPlan?.id === plan.id;
        const optionPrice =
          billingMode === 'monthly'
            ? `${formatUyuCents(plan.monthlyPriceCents)} / mes`
            : plan.annualInstallmentCents > 0
              ? `12x ${formatUyuCents(plan.annualInstallmentCents)}`
              : 'Gratis';

        return {
          id: plan.id,
          name: plan.name,
          isSelected,
          optionPrice,
        };
      }),
    [billingMode, selectedPlan],
  );
  const maxAnnualSavingsPercent = getMaxAnnualSavingsPercent();
  const handleSelectPlanCta = useCallback(() => {
    if (isBusy) {
      return;
    }

    setPlanSelectionIntent({
      planId: selectedPlanId,
      billingMode,
    });
    setError(null);
    setMessage(null);
  }, [billingMode, isBusy, selectedPlanId]);
  const handleModeChange = useCallback(
    (nextMode: AuthMode) => {
      if (!isBusy) {
        setMode(nextMode);
      }
    },
    [isBusy],
  );
  const handleSelectPlanId = useCallback((planId: MarketplacePlanId) => {
    setSelectedPlanId(planId);
  }, []);
  const inputClassNames = {
    inputWrapper: 'login-input-wrapper',
    label: 'login-input-label',
    input: 'login-input-field',
  };

  /* Mode switcher: only login/register as primary tabs */
  const modeButtonClassName = (isActive: boolean) =>
    `relative z-10 flex min-h-[2.5rem] items-center justify-center gap-1.5 px-3 py-2 text-center text-[0.82rem] font-semibold leading-tight transition-all duration-200 sm:gap-2 sm:px-4 ${
      isActive
        ? 'text-ink dark:text-white'
        : 'text-slate/54 hover:text-ink dark:text-zinc-400 dark:hover:text-white'
    }`;

  return (
    <div
      className="mx-auto w-full max-w-[28rem]"
    >
      {/* Auth form */}
      <div className="login-right-panel flex flex-col rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.12)] dark:border-white/10 dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.8)] md:p-8">
        {/* Mode switcher - 2 tabs: login/register */}
        {mode !== 'recover' && mode !== 'reset' ? (
          <div className="relative rounded-[1.2rem] border border-slate-200 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/[0.03]">
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute bottom-1 top-1 rounded-[0.85rem] bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.1)] transition-all duration-300 dark:bg-gradient-to-r dark:from-violet-600/90 dark:to-indigo-500/90 dark:shadow-[0_0_12px_rgba(139,92,246,0.3)] dark:border dark:border-white/10 ${
                mode === 'login'
                  ? 'left-1 w-[calc(50%-0.375rem)]'
                  : 'left-[calc(50%+0.125rem)] w-[calc(50%-0.375rem)]'
              }`}
            />
            <div className="grid grid-cols-2">
              <Button
                type="button"
                variant="light"
                className={modeButtonClassName(mode === 'login')}
                data-testid="auth-mode-login"
                data-active={String(mode === 'login')}
                onPress={() => handleModeChange('login')}
              >
                <LogIn className="h-3.5 w-3.5 opacity-90" />
                Ingresar
              </Button>
              <Button
                type="button"
                variant="light"
                className={modeButtonClassName(mode === 'register')}
                data-testid="auth-mode-register"
                data-active={String(mode === 'register')}
                onPress={() => handleModeChange('register')}
              >
                <UserPlus className="h-3.5 w-3.5 opacity-90" />
                Crear cuenta
              </Button>
            </div>
          </div>
        ) : null}

        {/* Title */}
        <div className={mode !== 'recover' && mode !== 'reset' ? 'mt-6' : ''}>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-white">
            {titleByMode[mode]}
          </h2>
          <p className="mt-1.5 text-sm text-slate/70 dark:text-zinc-400">{subtitleByMode[mode]}</p>
        </div>

        {/* Banners */}
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

        {/* Form card */}
        <div
          key={mode}
          className="page-enter mt-5 flex flex-col gap-5 sm:gap-6"
        >
          {/* Recover mode */}
          {mode === 'recover' ? (
            <form className="space-y-4" onSubmit={sendPasswordRecovery}>
              <Input
                id="recoverEmail"
                type="email"
                label="Email"
                labelPlacement="inside"
                variant="flat"
                radius="lg"
                classNames={inputClassNames}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Button
                type="submit"
                isLoading={activeAction === 'recover'}
                isDisabled={isBusy}
                radius="lg"
                className="login-cta-btn w-full py-3 text-sm font-semibold text-white transition-all duration-200"
              >
                {activeAction === 'recover'
                  ? 'Enviando enlace...'
                  : 'Enviar enlace de recuperacion'}
              </Button>
              <button
                type="button"
                className="block w-full text-center text-sm font-medium text-slate/60 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-violet-200/60 dark:hover:text-violet-100"
                onClick={() => handleModeChange('login')}
              >
                Volver a ingresar
              </button>
            </form>
          ) : null}

          {/* Reset mode */}
          {mode === 'reset' ? (
            <form className="space-y-4" onSubmit={updatePassword}>
              {!hasRecoverySession ? (
                <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
                  Tu sesion de recuperacion no esta activa. Solicita un nuevo enlace.
                </p>
              ) : null}
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                label="Nueva contrasena"
                labelPlacement="inside"
                variant="flat"
                radius="lg"
                classNames={inputClassNames}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                endContent={<PasswordToggle visible={showNewPassword} onToggle={() => setShowNewPassword((v) => !v)} />}
                required
                minLength={8}
              />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirmar contrasena"
                labelPlacement="inside"
                variant="flat"
                radius="lg"
                classNames={inputClassNames}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                endContent={<PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} />}
                required
                minLength={8}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  isLoading={activeAction === 'reset'}
                  isDisabled={isBusy || !hasRecoverySession}
                  radius="lg"
                  className="login-cta-btn flex-1 py-3 text-sm font-semibold text-white transition-all duration-200"
                >
                  {activeAction === 'reset' ? 'Actualizando...' : 'Guardar nueva contrasena'}
                </Button>
                <Button
                  type="button"
                  variant="bordered"
                  radius="lg"
                  className="border-slate-200/70 py-3 text-sm font-semibold text-sky-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-white/5"
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

          {/* Login / Register mode */}
          {isPasswordMode ? (
            <form
              className="space-y-4"
              onSubmit={mode === 'login' ? loginWithPassword : registerWithPassword}
            >
              {mode === 'register' ? (
                <Input
                  id="fullName"
                  label="Nombre y apellido"
                  labelPlacement="inside"
                  variant="flat"
                  radius="lg"
                  classNames={inputClassNames}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              ) : null}

              <Input
                id="email"
                type="email"
                label="Email"
                labelPlacement="inside"
                variant="flat"
                radius="lg"
                classNames={inputClassNames}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <div className="space-y-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Contrasena"
                  labelPlacement="inside"
                  variant="flat"
                  radius="lg"
                  classNames={inputClassNames}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  endContent={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
                  required
                  {...(mode === 'register' ? { minLength: 8 } : {})}
                />
                {mode === 'register' ? (
                  <p className="pl-1 text-xs text-slate/50 dark:text-zinc-500">Minimo 8 caracteres.</p>
                ) : null}
              </div>

              {/* Primary action button */}
              <Button
                type="submit"
                radius="lg"
                isLoading={activeAction === (mode === 'login' ? 'login' : 'register')}
                isDisabled={isBusy}
                className="login-cta-btn w-full py-3 text-sm font-semibold text-white transition-all duration-200"
              >
                {activeAction === 'login'
                  ? 'Ingresando...'
                  : activeAction === 'register'
                    ? 'Creando cuenta...'
                    : mode === 'login'
                      ? 'Ingresar'
                      : 'Crear cuenta'}
              </Button>

              {/* Magic link - login only */}
              {mode === 'login' ? (
                <Button
                  type="button"
                  variant="light"
                  className="w-full text-sm font-semibold text-sky-600 transition-all duration-200 hover:text-sky-500 dark:text-zinc-300 dark:hover:text-white"
                  isLoading={activeAction === 'magic-link'}
                  isDisabled={isBusy || !email}
                  onClick={(event) => {
                    void sendMagicLink(event);
                  }}
                >
                  {activeAction === 'magic-link' ? 'Enviando enlace...' : 'Recibir enlace magico'}
                </Button>
              ) : null}

              {/* Social divider */}
              <div className="relative flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-slate-200/60 dark:bg-white/10" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/40 dark:text-zinc-500">
                  o continua con
                </span>
                <div className="h-px flex-1 bg-slate-200/60 dark:bg-white/10" />
              </div>

              {/* Social buttons */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="flat"
                  radius="lg"
                  className="login-social-btn login-social-google w-full gap-2.5 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                  isLoading={activeAction === 'google'}
                  isDisabled={isBusy}
                  onClick={() => {
                    void signInWithSocialProvider('google');
                  }}
                  startContent={
                    activeAction !== 'google' ? (
                      <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    ) : undefined
                  }
                >
                  {activeAction === 'google' ? 'Redirigiendo...' : 'Continuar con Google'}
                </Button>
                <Button
                  type="button"
                  variant="flat"
                  radius="lg"
                  className="login-social-btn login-social-facebook w-full gap-2.5 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                  isLoading={activeAction === 'facebook'}
                  isDisabled={isBusy}
                  onClick={() => {
                    void signInWithSocialProvider('facebook');
                  }}
                  startContent={
                    activeAction !== 'facebook' ? (
                      <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    ) : undefined
                  }
                >
                  {activeAction === 'facebook' ? 'Redirigiendo...' : 'Continuar con Facebook'}
                </Button>
              </div>

              {/* Forgot password - login only */}
              {mode === 'login' ? (
                <button
                  type="button"
                  className="block w-full text-center text-xs text-slate/50 transition-colors hover:text-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:pointer-events-none dark:text-zinc-400 dark:hover:text-white"
                  disabled={isBusy}
                  onClick={() => {
                    if (!isBusy) {
                      setMode('recover');
                      setPassword('');
                    }
                  }}
                >
                  Olvide mi contrasena
                </button>
              ) : null}
            </form>
          ) : null}
        </div>

        {/* Guest link */}
        <div className="mt-5 flex justify-center">
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate/60 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-violet-200/70 dark:hover:text-violet-100"
          >
            Continuar sin cuenta
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
