'use client';

import Link from 'next/link';
import {
  Check,
  ChevronRight,
  KeyRound,
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  const planCtaLabel = selectedPlan?.name || 'plan';
  const handleSelectPlanCta = useCallback(() => {
    if (isBusy) {
      return;
    }

    setPlanSelectionIntent({
      planId: selectedPlanId,
      billingMode,
    });
    setError(null);
    setMessage(
      selectedPlanId === 'free'
        ? 'Plan Free seleccionado. Crea tu cuenta para empezar.'
        : `Plan ${planCtaLabel} seleccionado. Crea tu cuenta y luego activa la suscripcion desde tu panel.`,
    );
    setMode('register');
  }, [billingMode, isBusy, planCtaLabel, selectedPlanId]);
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
  const modeButtonClassName = (isActive: boolean) =>
    `relative z-10 flex min-h-[2.5rem] items-center justify-center gap-1.5 px-2 py-2 text-center text-[0.75rem] font-semibold leading-tight transition-all duration-200 sm:gap-2 sm:px-3 sm:text-[0.82rem] ${
      isActive
        ? 'text-ink dark:text-white'
        : 'text-slate/54 hover:text-ink dark:text-violet-200/60 dark:hover:text-violet-100'
    }`;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] xl:gap-6">
      {/* Left panel - plans */}
      <aside className="login-plans-panel relative order-last overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.12)] dark:border-violet-500/15 dark:text-white dark:shadow-[0_1px_3px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.6)] lg:order-first md:p-8">
        <div className="relative flex h-full flex-col">
          <p className="hero-eyebrow w-fit">
            <Sparkles className="h-3.5 w-3.5" />
            Planes de suscripcion
          </p>
          <p className="login-plans-text-muted mt-4 text-sm text-slate/70">
            Los planes de {APP_NAME} empiezan desde{' '}
            {formatUyuCents(getSubscriptionPlanDescriptor('free').monthlyPriceCents)} / mes
          </p>
          <h1 className="mt-7 text-balance text-3xl font-[family-name:var(--font-heading)] font-semibold leading-[1.07] tracking-tight text-ink dark:text-white md:text-[2.15rem]">
            Elige el mejor plan para tu barberia
          </h1>
          <p className="login-plans-text-muted mt-3 max-w-md text-sm text-slate/65">
            Compara precios, funcionalidades y cambia entre pago mensual o anual en cuotas.
          </p>

          <div className="mt-5 w-full rounded-[1.25rem] border border-slate-200/60 bg-slate-50/50 p-2 dark:border-white/12 dark:bg-white/[0.03]">
            <p className="login-plans-text-muted mb-2 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/60">
              Ahorra hasta {maxAnnualSavingsPercent}%
            </p>
            <div className="relative grid grid-cols-2 items-stretch rounded-full border border-slate-200/60 bg-slate-100/60 p-1 dark:border-white/12 dark:bg-black/20">
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-ink shadow-[0_4px_12px_-6px_rgba(15,23,42,0.3)] transition-transform duration-300 dark:bg-white dark:shadow-[0_4px_12px_-6px_rgba(0,0,0,0.4)] ${
                  billingMode === 'monthly' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <Button
                type="button"
                size="sm"
                radius="full"
                variant="light"
                className={`relative z-10 h-auto min-h-[2.75rem] rounded-full px-2 py-2 text-center text-[11px] font-semibold leading-tight whitespace-normal transition sm:px-3 sm:text-xs ${
                  billingMode === 'monthly'
                    ? 'login-billing-active !text-white'
                    : 'login-billing-inactive !text-slate/60'
                }`}
                aria-pressed={billingMode === 'monthly'}
                onPress={() => {
                  setBillingMode('monthly');
                }}
              >
                Mensual
              </Button>
              <Button
                type="button"
                size="sm"
                radius="full"
                variant="light"
                className={`relative z-10 h-auto min-h-[2.75rem] rounded-full px-2 py-2 text-center text-[11px] font-semibold leading-tight whitespace-normal transition sm:px-3 sm:text-xs ${
                  billingMode === 'annual_installments'
                    ? 'login-billing-active !text-white'
                    : 'login-billing-inactive !text-slate/60'
                }`}
                aria-pressed={billingMode === 'annual_installments'}
                onPress={() => {
                  setBillingMode('annual_installments');
                }}
              >
                Anual en cuotas
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {planOptions.map((plan, index) => {
              const isLastOddMobileCard =
                planOptions.length > 1 &&
                planOptions.length % 2 === 1 &&
                index === planOptions.length - 1;

              return (
                <Button
                  key={`plan-option-${plan.id}`}
                  type="button"
                  variant="light"
                  onPress={() => handleSelectPlanId(plan.id)}
                  className={`rounded-[1rem] border px-3 py-2 text-left transition ${isLastOddMobileCard ? 'col-span-2 sm:col-span-1' : ''} ${
                    plan.isSelected
                      ? 'border-violet-400/40 bg-violet-100/60 shadow-[0_4px_16px_-8px_rgba(139,92,246,0.2)] dark:border-violet-300/45 dark:bg-violet-400/15 dark:shadow-[0_4px_16px_-8px_rgba(139,92,246,0.3)]'
                      : 'border-slate-200/60 bg-slate-50/40 hover:bg-slate-100/60 dark:border-white/12 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]'
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      plan.isSelected ? '!text-violet-800 login-plan-btn-name-selected' : '!text-ink/80 login-plan-btn-name'
                    }`}
                  >
                    {plan.name}
                  </p>
                  <p className="login-plan-btn-price mt-1 text-[11px] text-slate/60">{plan.optionPrice}</p>
                </Button>
              );
            })}
          </div>

          <article className="mt-3 rounded-[1.35rem] border border-violet-300/40 bg-violet-50/80 p-4 shadow-[0_4px_16px_-8px_rgba(139,92,246,0.15)] dark:border-violet-300/28 dark:bg-violet-950/80 dark:shadow-[0_4px_16px_-8px_rgba(139,92,246,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="login-plan-detail-name text-2xl font-semibold leading-tight text-ink dark:text-white">
                  {selectedPlan?.name}
                </p>
                <p className="login-plans-text-muted mt-1 text-xs text-slate/60">{selectedPlan?.description}</p>
              </div>
              {selectedPlan?.badge ? (
                <span className="login-plan-badge inline-flex shrink-0 rounded-full border border-violet-400/40 bg-violet-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:border-violet-300/45 dark:bg-violet-400/18 dark:text-violet-100">
                  {selectedPlan.badge}
                </span>
              ) : null}
            </div>

            <div className="mt-3 border-t border-slate-200/60 pt-3 dark:border-white/10">
              <p className="login-plan-detail-price text-4xl font-semibold leading-none tracking-[-0.02em] text-ink dark:text-white">
                {billingMode === 'monthly'
                  ? `${formatUyuCents(selectedPlan?.monthlyPriceCents || 0)} / mes`
                  : (selectedPlan?.annualInstallmentCents || 0) > 0
                    ? `12x ${formatUyuCents(selectedPlan?.annualInstallmentCents || 0)} / mes`
                    : 'Gratis'}
              </p>
              <p className="login-plans-text-muted mt-2 text-sm text-slate/60 dark:text-white/68">
                {billingMode === 'monthly'
                  ? 'Facturacion mes a mes'
                  : (selectedPlan?.annualInstallmentCents || 0) > 0
                    ? `Precio total anual ${formatUyuCents((selectedPlan?.annualInstallmentCents || 0) * 12)}`
                    : 'Sin costo anual'}
              </p>
            </div>

            <ul className="mt-4 space-y-1.5">
              {selectedPlanFeatures.map((feature) => (
                <li
                  key={`${selectedPlan?.id || 'plan'}-${feature}`}
                  className="login-plans-feature-item flex items-start gap-2 text-sm text-ink/80"
                >
                  <span className="mt-[0.1rem] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="light"
              className="login-cta-btn mt-4 w-full rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition"
              onPress={handleSelectPlanCta}
            >
              Elegir {selectedPlan?.name}
            </Button>
          </article>
        </div>
      </aside>

      {/* Right panel - auth form */}
      <div className="login-right-panel flex flex-col rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.12)] dark:border-violet-500/15 dark:shadow-[0_0_80px_-20px_rgba(139,92,246,0.3)] md:p-8">
        {/* Mode switcher */}
        <div className="relative rounded-[1.2rem] border border-slate-200/60 bg-slate-50/60 p-1 dark:border-violet-500/15 dark:bg-[rgba(139,92,246,0.06)]">
          {/* Sliding active pill */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-1 top-1 rounded-[0.85rem] bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.1)] dark:bg-gradient-to-r dark:from-violet-600/80 dark:to-fuchsia-600/80 dark:shadow-[0_0_12px_rgba(139,92,246,0.4)] transition-all duration-300 ${
              mode === 'login'
                ? 'left-1 w-[calc(33.333%-0.375rem)]'
                : mode === 'register'
                  ? 'left-[calc(33.333%+0.125rem)] w-[calc(33.333%-0.375rem)]'
                  : 'left-[calc(66.666%+0.25rem)] w-[calc(33.333%-0.625rem)]'
            }`}
          />
          <div className="grid grid-cols-3">
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
              Registro
            </Button>
            <Button
              type="button"
              variant="light"
              className={modeButtonClassName(mode === 'recover')}
              data-testid="auth-mode-recover"
              data-active={String(mode === 'recover')}
              onPress={() => handleModeChange('recover')}
            >
              <KeyRound className="h-3.5 w-3.5 opacity-90" />
              Recuperar
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="mt-6">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-white">
            {titleByMode[mode]}
          </h2>
          <p className="mt-1.5 text-sm text-slate/70 dark:text-violet-200/70">{subtitleByMode[mode]}</p>
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
          className="page-enter mt-5 flex flex-col gap-5 rounded-[1.65rem] border border-slate-200/40 bg-slate-50/40 p-5 dark:border-[rgba(139,92,246,0.15)] dark:bg-[rgba(139,92,246,0.06)] md:p-6"
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
                radius="xl"
                className="login-cta-btn w-full py-3 text-sm font-semibold text-white transition-all duration-200"
              >
                {activeAction === 'recover'
                  ? 'Enviando enlace...'
                  : 'Enviar enlace de recuperacion'}
              </Button>
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
                type="password"
                label="Nueva contrasena"
                labelPlacement="inside"
                variant="flat"
                radius="lg"
                classNames={inputClassNames}
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
                variant="flat"
                radius="lg"
                classNames={inputClassNames}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  isLoading={activeAction === 'reset'}
                  isDisabled={isBusy || !hasRecoverySession}
                  radius="xl"
                  className="login-cta-btn flex-1 py-3 text-sm font-semibold text-white transition-all duration-200"
                >
                  {activeAction === 'reset' ? 'Actualizando...' : 'Guardar nueva contrasena'}
                </Button>
                <Button
                  type="button"
                  variant="bordered"
                  radius="xl"
                  className="border-slate-200/70 py-3 text-sm font-semibold text-sky-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 dark:border-violet-500/30 dark:text-violet-300 dark:hover:border-violet-400/50 dark:hover:bg-violet-500/10"
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
                  type="password"
                  label="Contrasena"
                  labelPlacement="inside"
                  variant="flat"
                  radius="lg"
                  classNames={inputClassNames}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  {...(mode === 'register' ? { minLength: 8 } : {})}
                />
                {mode === 'register' ? (
                  <p className="pl-1 text-xs text-slate/50 dark:text-violet-200/50">Minimo 8 caracteres.</p>
                ) : null}
              </div>

              {/* Primary action button */}
              <Button
                type="submit"
                radius="xl"
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
                  className="w-full text-sm font-semibold text-sky-600 transition-all duration-200 hover:text-sky-500 dark:text-violet-400 dark:hover:text-violet-300"
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
                <div className="h-px flex-1 bg-slate-200/60 dark:bg-violet-500/15" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/40 dark:text-violet-200/40">
                  o continua con
                </span>
                <div className="h-px flex-1 bg-slate-200/60 dark:bg-violet-500/15" />
              </div>

              {/* Social buttons */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="bordered"
                  radius="lg"
                  className="w-full justify-center gap-2 border-slate-200/70 bg-transparent py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50/60 dark:border-[rgba(139,92,246,0.15)] dark:text-slate-200 dark:hover:border-violet-400/30 dark:hover:bg-[rgba(139,92,246,0.1)]"
                  isLoading={activeAction === 'google'}
                  isDisabled={isBusy}
                  onClick={() => {
                    void signInWithSocialProvider('google');
                  }}
                  startContent={
                    activeAction !== 'google' ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    ) : undefined
                  }
                >
                  {activeAction === 'google' ? 'Redirigiendo...' : 'Google'}
                </Button>
                <Button
                  type="button"
                  variant="bordered"
                  radius="lg"
                  className="w-full justify-center gap-2 border-slate-200/70 bg-transparent py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50/60 dark:border-[rgba(139,92,246,0.15)] dark:text-slate-200 dark:hover:border-violet-400/30 dark:hover:bg-[rgba(139,92,246,0.1)]"
                  isLoading={activeAction === 'facebook'}
                  isDisabled={isBusy}
                  onClick={() => {
                    void signInWithSocialProvider('facebook');
                  }}
                  startContent={
                    activeAction !== 'facebook' ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    ) : undefined
                  }
                >
                  {activeAction === 'facebook' ? 'Redirigiendo...' : 'Facebook'}
                </Button>
              </div>

              {/* Forgot password - login only */}
              {mode === 'login' ? (
                <button
                  type="button"
                  className="block w-full text-center text-xs text-slate/50 transition-all duration-200 hover:text-sky-600 disabled:pointer-events-none dark:text-violet-200/50 dark:hover:text-violet-300"
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

        {/* Guest link - bottom of right panel */}
        <div className="mt-5 flex justify-center">
          <Link
            href="/book"
            className="inline-flex items-center gap-1 text-xs text-slate/40 transition-all duration-200 hover:text-sky-600 dark:text-violet-100/65 dark:hover:text-violet-100/90"
          >
            Seguir como invitado
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
