import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { buildAdminNotificationDigest, getAdminNotificationsData } from '@/lib/admin-notifications';
import { requireAdminWorkspaceAccess } from '@/lib/workspace-admin-api';

const adminNotificationsSummaryQuerySchema = z.object({
  shop_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
  }

  const parsed = adminNotificationsSummaryQuerySchema.safeParse({
    shop_id: request.nextUrl.searchParams.get('shop_id'),
  });

  if (!parsed.success) {
    return NextResponse.json({ message: 'shop_id invalido.' }, { status: 400 });
  }

  try {
    await requireAdminWorkspaceAccess({
      userId: user.id,
      shopId: parsed.data.shop_id,
    });
  } catch (cause) {
    return NextResponse.json(
      { message: cause instanceof Error ? cause.message : 'Acceso denegado.' },
      { status: 403 },
    );
  }

  const notifications = await getAdminNotificationsData(parsed.data.shop_id);
  const items = buildAdminNotificationDigest(notifications, { limit: 10 });

  return NextResponse.json({
    pending_count: notifications.totalCount,
    pending_time_off_count: notifications.pendingTimeOffCount,
    pending_membership_count: notifications.pendingMembershipCount,
    stale_pending_intents: notifications.stalePendingIntents,
    items,
  });
}
