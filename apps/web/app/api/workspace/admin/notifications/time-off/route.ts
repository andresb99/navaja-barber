import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { reviewPendingTimeOffRequest } from '@/lib/admin-time-off';
import { requireAdminWorkspaceAccess } from '@/lib/workspace-admin-api';

const reviewTimeOffSchema = z.object({
  shop_id: z.string().uuid(),
  time_off_id: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
});

export async function POST(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = reviewTimeOffSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos invalidos.' }, { status: 400 });
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

  await reviewPendingTimeOffRequest({
    shopId: parsed.data.shop_id,
    timeOffId: parsed.data.time_off_id,
    decision: parsed.data.decision,
  });

  return NextResponse.json({ success: true });
}
