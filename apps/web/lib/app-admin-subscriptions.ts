import 'server-only';

import { revalidatePath } from 'next/cache';
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/subscription-plans';
import { createSupabaseAdminClient } from './supabase/admin';

interface ShopRow {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface SubscriptionRow {
  shop_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
}

export interface AppAdminSubscriptionRecord {
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopStatus: string;
  plan: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

function seatsByPlan(plan: SubscriptionTier) {
  if (plan === 'pro') {
    return 6;
  }

  if (plan === 'business') {
    return 20;
  }

  if (plan === 'app_admin') {
    return 99;
  }

  return 3;
}

function periodEndByPlan(plan: SubscriptionTier, status: SubscriptionStatus) {
  if (plan === 'free' || status === 'cancelled') {
    return null;
  }

  const next = new Date();
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
}

export async function listAppAdminSubscriptions(): Promise<AppAdminSubscriptionRecord[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: shops }, { data: subscriptions }] = await Promise.all([
    admin.from('shops').select('id, name, slug, status').order('created_at', { ascending: false }),
    admin.from('subscriptions').select('shop_id, plan, status, current_period_end'),
  ]);

  const subscriptionsByShopId = new Map<string, SubscriptionRow>();
  for (const item of (subscriptions || []) as SubscriptionRow[]) {
    subscriptionsByShopId.set(String(item.shop_id), item);
  }

  return ((shops || []) as ShopRow[]).map((shop) => {
    const subscription = subscriptionsByShopId.get(String(shop.id));

    return {
      shopId: String(shop.id),
      shopName: String(shop.name),
      shopSlug: String(shop.slug),
      shopStatus: String(shop.status),
      plan: (subscription?.plan || 'free') as SubscriptionTier,
      status: (subscription?.status || 'active') as SubscriptionStatus,
      currentPeriodEnd: subscription?.current_period_end || null,
    };
  });
}

export async function setShopSubscriptionForTesting(input: {
  shopId: string;
  plan: SubscriptionTier;
  status: SubscriptionStatus;
}) {
  const admin = createSupabaseAdminClient();
  const currentPeriodEnd = periodEndByPlan(input.plan, input.status);

  const { error } = await admin.from('subscriptions').upsert(
    {
      shop_id: input.shopId,
      plan: input.plan,
      status: input.status,
      seats_included: seatsByPlan(input.plan),
      trial_ends_at: input.status === 'trialing' ? currentPeriodEnd : null,
      current_period_end: currentPeriodEnd,
    },
    { onConflict: 'shop_id' },
  );

  if (error) {
    throw new Error(error.message || 'No se pudo actualizar la suscripcion.');
  }

  revalidatePath('/app-admin/subscriptions');
  revalidatePath('/admin/barbershop');
}
