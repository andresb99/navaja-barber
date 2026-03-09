'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/subscription-plans';

const updateSubscriptionSchema = z.object({
  shop_id: z.string().uuid(),
  plan: z.enum(['free', 'pro', 'business', 'app_admin']),
  status: z.enum(['trialing', 'active', 'past_due', 'cancelled']),
});

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

export async function setShopSubscriptionForTestingAction(formData: FormData) {
  await requirePlatformAdmin('/app-admin/subscriptions');

  const parsed = updateSubscriptionSchema.safeParse({
    shop_id: sanitizeText(formData.get('shop_id')),
    plan: sanitizeText(formData.get('plan')),
    status: sanitizeText(formData.get('status')),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos invalidos.');
  }

  const payload = parsed.data;
  const admin = createSupabaseAdminClient();
  const currentPeriodEnd = periodEndByPlan(payload.plan, payload.status);

  const { error } = await admin.from('subscriptions').upsert(
    {
      shop_id: payload.shop_id,
      plan: payload.plan,
      status: payload.status,
      seats_included: seatsByPlan(payload.plan),
      trial_ends_at: payload.status === 'trialing' ? currentPeriodEnd : null,
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
