import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { resolveSubscriptionBillingMessage } from '@navaja/shared';
import { SubscriptionBillingPanel } from '@/components/admin/subscription-billing-panel';
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

import { cn } from '@/lib/cn';

import { SubscriptionClient } from '@/components/public/subscription-client';

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

export default async function SubscriptionPage({ searchParams }: SubscriptionPageProps) {
  const params = await searchParams;
  const ctx = await getCurrentAuthContext({ shopSlug: params.shop });
  const canManageSelectedWorkspace =
    ctx.selectedWorkspaceRole === 'admin' && Boolean(ctx.shopId && ctx.shopSlug);

  const selectedShopSlug = ctx.shopSlug || null;
  const manageWorkspaceHref =
    selectedShopSlug && canManageSelectedWorkspace
      ? buildAdminHref('/admin/barbershop', selectedShopSlug)
      : '/mis-barberias';

  const plans = PUBLIC_MARKETPLACE_PLANS.map((id) => getSubscriptionPlanDescriptor(id));

  return (
    <SubscriptionClient 
      plans={plans}
      ctx={{ role: ctx.role, shopSlug: ctx.shopSlug || null }}
      manageWorkspaceHref={manageWorkspaceHref}
    />
  );
}
