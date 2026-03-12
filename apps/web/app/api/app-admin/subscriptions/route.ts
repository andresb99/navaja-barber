import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/subscription-plans';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import {
  listAppAdminSubscriptions,
  setShopSubscriptionForTesting,
} from '@/lib/app-admin-subscriptions';
import { assertPlatformAdminAccess } from '@/lib/platform-admin';

const updateSubscriptionSchema = z.object({
  shop_id: z.string().uuid(),
  plan: z.enum(['free', 'pro', 'business', 'app_admin']),
  status: z.enum(['trialing', 'active', 'past_due', 'cancelled']),
});

async function requireApiPlatformAdmin(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return null;
  }

  await assertPlatformAdminAccess(user.id);
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiPlatformAdmin(request);
    if (!user?.id) {
      return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
    }
  } catch (cause) {
    return NextResponse.json(
      { message: cause instanceof Error ? cause.message : 'Acceso denegado.' },
      { status: 403 },
    );
  }

  const items = await listAppAdminSubscriptions();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiPlatformAdmin(request);
    if (!user?.id) {
      return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
    }
  } catch (cause) {
    return NextResponse.json(
      { message: cause instanceof Error ? cause.message : 'Acceso denegado.' },
      { status: 403 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = updateSubscriptionSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos invalidos.' }, { status: 400 });
  }

  await setShopSubscriptionForTesting({
    shopId: parsed.data.shop_id,
    plan: parsed.data.plan as SubscriptionTier,
    status: parsed.data.status as SubscriptionStatus,
  });

  return NextResponse.json({ success: true });
}
