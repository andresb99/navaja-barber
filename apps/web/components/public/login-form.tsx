'use client';

import Link from 'next/link';
import {
  Check,
  ChevronRight,
  KeyRound,
  LockKeyhole,
  LogIn,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Divider, Input } from '@heroui/react';
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
  const modeButtonClassName = (isActive: boolean) =>
    `group relative flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-[0.95rem] border px-2 py-2 text-center text-[0.75rem] font-semibold leading-tight transition sm:gap-2 sm:px-3 sm:text-[0.82rem] ${
      isActive
        ? 'border-transparent bg-white text-slate-900 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.2)]'
        : 'border-transparent bg-transparent text-slate/80 hover:bg-white/70 hover:text-ink dark:text-slate-200 dark:hover:bg-white/[0.08] dark:hover:text-slate-100'
    }`;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] xl:gap-6">
      <aside className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#05070f] p-6 text-white shadow-[0_1px_3px_rgba(0,0,0,0.3),0_12px_32px_-12px_rgba(2,6,23,0.7)] dark:border-white/10 dark:bg-[#0a0812] dark:text-white dark:shadow-[0_1px_3px_rgba(0,0,0,0.4),0_12px_32px_-12px_rgba(0,0,0,0.6)] md:p-8">
        <div className="relative flex h-full flex-col">
          <p className="hero-eyebrow w-fit border-white/20 bg-white/[0.05] text-white/85 dark:border-white/14 dark:bg-white/[0.06] dark:text-white/78">
            <Sparkles className="h-3.5 w-3.5" />
            Planes de suscripcion
          </p>
          <p className="mt-4 text-sm text-white/78 dark:text-white/78">
            Los planes de {APP_NAME} empiezan desde{' '}
            {formatUyuCents(getSubscriptionPlanDescriptor('free').monthlyPriceCents)} / mes
          </p>
          <h1 className="mt-7 text-balance text-3xl font-[family-name:var(--font-heading)] font-semibold leading-[1.07] tracking-tight text-white dark:text-white md:text-[2.15rem]">
            Elige el mejor plan para tu barberia
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/72 dark:text-white/72">
            Compara precios, funcionalidades y cambia entre pago mensual o anual en cuotas.
          </p>

          <div className="mt-5 w-full rounded-[1.25rem] border border-white/12 bg-white/[0.03] p-2 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <p className="mb-2 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 dark:text-white/72">
              Ahorra hasta {maxAnnualSavingsPercent}%
            </p>
            <div className="relative grid grid-cols-2 items-stretch rounded-full border border-white/12 bg-white/[0.04] p-1 dark:border-white/10 dark:bg-black/20">
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-[0_4px_12px_-6px_rgba(0,0,0,0.3)] transition-transform duration-300 dark:bg-slate-100 dark:shadow-[0_4px_12px_-6px_rgba(0,0,0,0.4)] ${
                  billingMode === 'monthly' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <Button
                type="button"
                size="sm"
                radius="full"
                variant="light"
                className={`relative z-10 h-auto min-h-[2.75rem] rounded-full px-2 py-2 text-center text-[11px] font-semibold leading-tight whitespace-normal transition sm:px-3 sm:text-xs ${
                  billingMode === 'monthly' ? 'text-slate-900' : 'text-white/78 dark:text-white/78'
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
                    ? 'text-slate-900'
                    : 'text-white/78 dark:text-white/78'
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
                      ? 'border-violet-300/45 bg-violet-400/15 shadow-[0_4px_16px_-8px_rgba(139,92,246,0.3)] dark:border-white/14 dark:bg-violet-500/[0.1] dark:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.4)]'
                      : 'border-white/12 bg-white/[0.03] hover:bg-white/[0.07] dark:border-white/12 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]'
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      plan.isSelected
                        ? 'text-white dark:text-white'
                        : 'text-white/86 dark:text-white/86'
                    }`}
                  >
                    {plan.name}
                  </p>
                  <p className="mt-1 text-[11px] text-white/62 dark:text-white/62">
                    {plan.optionPrice}
                  </p>
                </Button>
              );
            })}
          </div>

          <article className="mt-3 rounded-[1.35rem] border border-violet-300/28 bg-violet-950/80 p-4 text-white shadow-[0_4px_16px_-8px_rgba(139,92,246,0.25)] dark:border-white/10 dark:bg-violet-950/60 dark:text-white dark:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.4)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold leading-tight text-white dark:text-white">
                  {selectedPlan?.name}
                </p>
                <p className="mt-1 text-xs text-white/65 dark:text-white/65">
                  {selectedPlan?.description}
                </p>
              </div>
              {selectedPlan?.badge ? (
                <span className="inline-flex shrink-0 rounded-full border border-violet-300/45 bg-violet-400/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-100 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/88">
                  {selectedPlan.badge}
                </span>
              ) : null}
            </div>

            <div className="mt-3 border-t border-white/10 pt-3 dark:border-white/10">
              <p className="text-4xl font-semibold leading-none tracking-[-0.02em] text-white dark:text-white">
                {billingMode === 'monthly'
                  ? `${formatUyuCents(selectedPlan?.monthlyPriceCents || 0)} / mes`
                  : (selectedPlan?.annualInstallmentCents || 0) > 0
                    ? `12x ${formatUyuCents(selectedPlan?.annualInstallmentCents || 0)} / mes`
                    : 'Gratis'}
              </p>
              <p className="mt-2 text-sm text-white/68 dark:text-white/68">
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
                  className="flex items-start gap-2 text-sm text-white/86 dark:text-white/86"
                >
                  <span className="mt-[0.1rem] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-200 dark:bg-emerald-400/20 dark:text-emerald-200">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="light"
              className="mt-4 w-full rounded-xl border border-violet-300/45 bg-violet-400/18 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-100 transition hover:bg-violet-400/24 dark:border-white/12 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12]"
              onPress={handleSelectPlanCta}
            >
              Elegir {selectedPlan?.name}
            </Button>
          </article>
        </div>
      </aside>

      <div className="soft-panel rounded-[2rem] border-0 p-4 md:p-6">
        <div className="rounded-[1.6rem] border border-white/75 bg-white/66 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="grid grid-cols-3 gap-1 rounded-[1.2rem] border border-white/80 bg-white/60 p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-black/20 dark:shadow-none">
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

          <div className="mt-3 flex items-center justify-end">
            <Link
              href="/book"
              className="action-secondary inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold"
            >
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

        <div
          key={mode}
          className="page-enter mt-4 rounded-[1.65rem] border border-white/75 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.04]"
        >
          {mode === 'recover' ? (
            <form className="space-y-3" onSubmit={sendPasswordRecovery}>
              <Input
                id="recoverEmail"
                type="email"
                label="Email"
                labelPlacement="inside"
                variant="bordered"
                radius="lg"
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
                {activeAction === 'recover'
                  ? 'Enviando enlace...'
                  : 'Enviar enlace de recuperacion'}
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
                variant="bordered"
                radius="lg"
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
                variant="bordered"
                radius="lg"
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
                variant="bordered"
                radius="lg"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              ) : null}

              <Input
                id="email"
                type="email"
                label="Email"
                labelPlacement="inside"
                variant="bordered"
                radius="lg"
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
                variant="bordered"
                radius="lg"
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
                  radius="lg"
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
                <Divider className="bg-slate-200/90 dark:bg-white/10" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/75 bg-white px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/65 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
                  Social
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="bordered"
                  radius="lg"
                  className="w-full justify-center border-white/75 px-5 text-sm font-semibold text-ink dark:border-white/12 dark:text-slate-200"
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
                  variant="bordered"
                  radius="lg"
                  className="w-full justify-center border-white/75 px-5 text-sm font-semibold text-ink dark:border-white/12 dark:text-slate-200"
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
                <Button
                  type="button"
                  variant="light"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate/80 transition-colors md:hover:text-ink dark:text-slate-300 dark:md:hover:text-slate-100"
                  onPress={() => {
                    if (!isBusy) {
                      setMode('recover');
                      setPassword('');
                    }
                  }}
                >
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Olvide mi contrasena
                </Button>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
