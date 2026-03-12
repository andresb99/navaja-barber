'use server';

import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitize';
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/subscription-plans';
import { setShopSubscriptionForTesting } from '@/lib/app-admin-subscriptions';

const updateSubscriptionSchema = z.object({
  shop_id: z.string().uuid(),
  plan: z.enum(['free', 'pro', 'business', 'app_admin']),
  status: z.enum(['trialing', 'active', 'past_due', 'cancelled']),
});

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

  await setShopSubscriptionForTesting({
    shopId: parsed.data.shop_id,
    plan: parsed.data.plan as SubscriptionTier,
    status: parsed.data.status as SubscriptionStatus,
  });
}
