import { NextRequest, NextResponse } from 'next/server';
import { serviceUpsertSchema } from '@navaja/shared';
import { z } from 'zod';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { readSanitizedJsonBody } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdminWorkspaceAccess } from '@/lib/workspace-admin-api';

const serviceListQuerySchema = z.object({
  shop_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
  }

  const parsed = serviceListQuerySchema.safeParse({
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

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('services')
    .select('id, name, price_cents, duration_minutes, is_active')
    .eq('shop_id', parsed.data.shop_id)
    .order('name');

  if (error) {
    return NextResponse.json(
      { message: error.message || 'No se pudieron cargar los servicios.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    items: (data || []).map((item) => ({
      id: String(item.id),
      name: String(item.name),
      price_cents: Number(item.price_cents || 0),
      duration_minutes: Number(item.duration_minutes || 0),
      is_active: Boolean(item.is_active),
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
  }

  const body = await readSanitizedJsonBody(request);
  const parsed = serviceUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.flatten().formErrors.join(', ') || 'Datos invalidos.',
      },
      { status: 400 },
    );
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

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('services')
    .insert(parsed.data)
    .select('id, name, price_cents, duration_minutes, is_active')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: error?.message || 'No se pudo crear el servicio.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    item: {
      id: String(data.id),
      name: String(data.name),
      price_cents: Number(data.price_cents || 0),
      duration_minutes: Number(data.duration_minutes || 0),
      is_active: Boolean(data.is_active),
    },
  });
}
