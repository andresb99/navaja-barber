import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Card, CardBody } from '@heroui/card';
import { publicMarketingSubscriptionHero, resolveSubscriptionBillingMessage } from '@navaja/shared';
import { SubscriptionBillingPanel } from '@/components/admin/subscription-billing-panel';
import { MarketingHero } from '@/components/public/marketing';
import { getCurrentAuthContext } from '@/lib/auth';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import {
  getSubscriptionPlanDescriptor,
  normalizeSubscriptionStatus,
  normalizeSubscriptionTier,
  PUBLIC_MARKETPLACE_PLANS,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@/lib/subscription-plans';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildAdminHref } from '@/lib/workspace-routes';

interface SubscriptionPageProps {
  searchParams: Promise<{
    shop?: string;
    billing?: string;
  }>;
}

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Planes y precios',
  description:
    'Gestiona la suscripcion de tu cuenta y compara los planes Free, Pro y Business para tu operacion.',
  path: '/suscripcion',
});

interface SubscriptionRow {
  shop_id: string;
  plan: SubscriptionTier;
  status: SubscriptionStatus;
}

const UYU_FORMATTER = new Intl.NumberFormat('es-UY', {
  style: 'currency',
  currency: 'UYU',
  maximumFractionDigits: 0,
});

function formatUyuCents(amountCents: number) {
  return UYU_FORMATTER.format(Math.round(amountCents / 100));
}

export default async function SubscriptionPage({ searchParams }: SubscriptionPageProps) {
  const params = await searchParams;
  const ctx = await getCurrentAuthContext({ shopSlug: params.shop });
  const billingMessage = resolveSubscriptionBillingMessage(params.billing);
  const canManageSelectedWorkspace =
    ctx.selectedWorkspaceRole === 'admin' && Boolean(ctx.shopId && ctx.shopSlug);
  const canAdminAnyWorkspace = ctx.availableWorkspaces.some(
    (workspace) => workspace.accessRole === 'owner' || workspace.accessRole === 'admin',
  );

  let currentPlan: SubscriptionTier = 'free';
  let currentStatus: SubscriptionStatus = 'active';

  if (canManageSelectedWorkspace && ctx.shopId) {
    const supabase = await createSupabaseServerClient();
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('shop_id, plan, status')
      .eq('shop_id', ctx.shopId)
      .maybeSingle();

    const subscriptionData = (subscription as SubscriptionRow | null) || null;
    currentPlan = normalizeSubscriptionTier(subscriptionData?.plan);
    currentStatus = normalizeSubscriptionStatus(subscriptionData?.status);
  }

  const selectedShopSlug = ctx.shopSlug || null;
  const manageWorkspaceHref =
    selectedShopSlug && canManageSelectedWorkspace
      ? buildAdminHref('/admin/barbershop', selectedShopSlug)
      : '/mis-barberias';

  return (
    <section className="space-y-6">
      <MarketingHero
        eyebrow={publicMarketingSubscriptionHero.eyebrow}
        title={publicMarketingSubscriptionHero.title}
        description={publicMarketingSubscriptionHero.description}
        stats={PUBLIC_MARKETPLACE_PLANS.map((planId) => {
          const plan = getSubscriptionPlanDescriptor(planId);
          return {
            label: plan.name,
            value: formatUyuCents(plan.monthlyPriceCents),
            detail: 'por mes',
            valueClassName: 'mt-2 text-2xl font-semibold text-ink dark:text-slate-100',
          };
        })}
        layoutClassName="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"
        titleClassName="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100"
        descriptionClassName="mt-3 text-sm text-slate/80 dark:text-slate-300"
      />

      <div className="grid gap-3 md:grid-cols-3">
        {PUBLIC_MARKETPLACE_PLANS.map((planId) => {
          const plan = getSubscriptionPlanDescriptor(planId);
          const isRecommended = Boolean(plan.badge);
          return (
            <Card
              key={plan.id}
              className={`data-card rounded-[1.6rem] border-0 shadow-none${isRecommended ? ' ring-2 ring-violet-400/60 dark:ring-violet-500/50' : ''}`}
            >
              <CardBody className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-lg font-semibold text-ink dark:text-slate-100">{plan.name}</p>
                  {plan.badge ? (
                    <span className="rounded-full border border-violet-300/45 bg-violet-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-slate/75 dark:text-slate-300">{plan.description}</p>
                <div className="rounded-[1rem] border border-white/60 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-2xl font-bold leading-none text-ink dark:text-slate-100">
                    {plan.monthlyPriceCents > 0 ? formatUyuCents(plan.monthlyPriceCents) : 'Gratis'}
                  </p>
                  <p className="mt-1 text-xs text-slate/60 dark:text-slate-400">
                    {plan.monthlyPriceCents > 0 ? 'por mes' : 'para siempre'}
                  </p>
                  {plan.annualInstallmentCents > 0 ? (
                    <p className="mt-2 text-xs text-slate/70 dark:text-slate-400">
                      Anual: 12x {formatUyuCents(plan.annualInstallmentCents)}
                    </p>
                  ) : null}
                </div>
                <ul className="space-y-2 text-sm text-slate/85 dark:text-slate-200">
                  {plan.features.map((feature) => (
                    <li key={`${plan.id}-${feature}`} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {ctx.role === 'guest' ? (
        <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <p className="text-lg font-semibold text-ink dark:text-slate-100">
                Inicia sesion para suscribirte
              </p>
              <p className="mt-1 text-sm text-slate/75 dark:text-slate-300">
                Crea tu cuenta o ingresa para activar Pro o Business desde tu espacio de cuenta.
              </p>
            </div>
            <Link
              href="/login?mode=register&next=/suscripcion"
              className="action-primary inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold no-underline"
            >
              Ingresar o registrarme
            </Link>
          </CardBody>
        </Card>
      ) : null}

      {ctx.role !== 'guest' && canManageSelectedWorkspace && ctx.shopId ? (
        <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="space-y-5 p-5 md:p-6">
            <div>
              <p className="hero-eyebrow">Checkout</p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
                Suscripcion de tu cuenta
              </h2>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Cambia entre Pro y Business e inicia el pago en Mercado Pago para{' '}
                {ctx.shopName || 'la barberia seleccionada'}.
              </p>
            </div>

            <SubscriptionBillingPanel
              shopId={ctx.shopId}
              currentPlan={currentPlan}
              currentStatus={currentStatus}
              billingMessage={billingMessage}
            />
          </CardBody>
        </Card>
      ) : null}

      {ctx.role !== 'guest' && !canManageSelectedWorkspace ? (
        <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <p className="text-lg font-semibold text-ink dark:text-slate-100">
                Tu cuenta necesita una barberia administrable
              </p>
              <p className="mt-1 text-sm text-slate/75 dark:text-slate-300">
                {canAdminAnyWorkspace
                  ? 'Selecciona una barberia donde seas admin y luego activa el plan desde esta cuenta.'
                  : 'Primero crea una barberia para poder activar un plan desde tu cuenta.'}
              </p>
            </div>
            <Link
              href={canAdminAnyWorkspace ? manageWorkspaceHref : '/onboarding/barbershop'}
              className="action-secondary inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold no-underline"
            >
              {canAdminAnyWorkspace ? 'Elegir barberia' : 'Crear barberia'}
            </Link>
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
}
