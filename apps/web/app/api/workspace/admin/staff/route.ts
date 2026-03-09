import { NextRequest, NextResponse } from 'next/server';
import {
  staffUpsertSchema,
  timeOffUpsertSchema,
  workingHoursUpsertSchema,
} from '@navaja/shared';
import { z } from 'zod';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { readSanitizedJsonBody } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdminWorkspaceAccess } from '@/lib/workspace-admin-api';

const staffListQuerySchema = z.object({
  shop_id: z.string().uuid(),
});

const staffMutationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('staff'),
    payload: staffUpsertSchema,
  }),
  z.object({
    action: z.literal('working_hours'),
    payload: workingHoursUpsertSchema,
  }),
  z.object({
    action: z.literal('time_off'),
    payload: timeOffUpsertSchema,
  }),
]);

export async function GET(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
  }

  const parsed = staffListQuerySchema.safeParse({
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
  const [{ data: staffRows, error: staffError }, { data: workingHours }, { data: timeOffRows }] =
    await Promise.all([
      admin
        .from('staff')
        .select('id, name, role, phone, is_active')
        .eq('shop_id', parsed.data.shop_id)
        .order('name'),
      admin
        .from('working_hours')
        .select('id, staff_id, day_of_week, start_time, end_time, staff(name)')
        .eq('shop_id', parsed.data.shop_id)
        .order('day_of_week'),
      admin
        .from('time_off')
        .select('id, staff_id, start_at, end_at, reason, staff(name)')
        .eq('shop_id', parsed.data.shop_id)
        .order('start_at', { ascending: false })
        .limit(20),
    ]);

  if (staffError) {
    return NextResponse.json(
      { message: staffError.message || 'No se pudo cargar el staff.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    staff: (staffRows || []).map((item) => ({
      id: String(item.id),
      name: String(item.name),
      role: String(item.role || 'staff'),
      phone: String(item.phone),
      is_active: Boolean(item.is_active),
    })),
    working_hours: (workingHours || []).map((item) => ({
      id: String(item.id),
      staff_id: String(item.staff_id),
      day_of_week: Number(item.day_of_week || 0),
      start_time: String(item.start_time || ''),
      end_time: String(item.end_time || ''),
      staff_name: String((item.staff as { name?: string } | null)?.name || 'Staff'),
    })),
    time_off: (timeOffRows || []).map((item) => ({
      id: String(item.id),
      staff_id: String(item.staff_id),
      start_at: String(item.start_at),
      end_at: String(item.end_at),
      reason: String(item.reason || ''),
      staff_name: String((item.staff as { name?: string } | null)?.name || 'Staff'),
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return NextResponse.json({ message: 'Debes iniciar sesion.' }, { status: 401 });
  }

  const body = await readSanitizedJsonBody(request);
  const parsed = staffMutationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.flatten().formErrors.join(', ') || 'Datos invalidos.' },
      { status: 400 },
    );
  }

  try {
    await requireAdminWorkspaceAccess({
      userId: user.id,
      shopId: parsed.data.payload.shop_id,
    });
  } catch (cause) {
    return NextResponse.json(
      { message: cause instanceof Error ? cause.message : 'Acceso denegado.' },
      { status: 403 },
    );
  }

  const admin = createSupabaseAdminClient();

  if (parsed.data.action === 'staff') {
    const { data, error } = await admin
      .from('staff')
      .insert(parsed.data.payload)
      .select('id, name, role, phone, is_active')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: error?.message || 'No se pudo crear el staff.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      item: {
        id: String(data.id),
        name: String(data.name),
        role: String(data.role || 'staff'),
        phone: String(data.phone),
        is_active: Boolean(data.is_active),
      },
    });
  }

  if (parsed.data.action === 'working_hours') {
    const { data: scopedStaff } = await admin
      .from('staff')
      .select('id')
      .eq('id', parsed.data.payload.staff_id)
      .eq('shop_id', parsed.data.payload.shop_id)
      .maybeSingle();

    if (!scopedStaff?.id) {
      return NextResponse.json(
        { message: 'El staff seleccionado no pertenece a esta barberia.' },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from('working_hours')
      .insert(parsed.data.payload)
      .select('id, staff_id, day_of_week, start_time, end_time, staff(name)')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: error?.message || 'No se pudo crear el horario.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      item: {
        id: String(data.id),
        staff_id: String(data.staff_id),
        day_of_week: Number(data.day_of_week || 0),
        start_time: String(data.start_time || ''),
        end_time: String(data.end_time || ''),
        staff_name: String((data.staff as { name?: string } | null)?.name || 'Staff'),
      },
    });
  }

  const { data: scopedStaff } = await admin
    .from('staff')
    .select('id')
    .eq('id', parsed.data.payload.staff_id)
    .eq('shop_id', parsed.data.payload.shop_id)
    .maybeSingle();

  if (!scopedStaff?.id) {
    return NextResponse.json(
      { message: 'El staff seleccionado no pertenece a esta barberia.' },
      { status: 400 },
    );
  }

  const { data, error } = await admin
    .from('time_off')
    .insert(parsed.data.payload)
    .select('id, staff_id, start_at, end_at, reason, staff(name)')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: error?.message || 'No se pudo crear el bloqueo.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    item: {
      id: String(data.id),
      staff_id: String(data.staff_id),
      start_at: String(data.start_at),
      end_at: String(data.end_at),
      reason: String(data.reason || ''),
      staff_name: String((data.staff as { name?: string } | null)?.name || 'Staff'),
    },
  });
}
