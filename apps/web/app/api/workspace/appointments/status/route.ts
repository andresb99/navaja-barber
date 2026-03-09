import { NextRequest, NextResponse } from 'next/server';
import { updateAppointmentStatusSchema } from '@navaja/shared';
import { z } from 'zod';
import { updateAppointmentStatusForActor } from '@/lib/appointment-status.server';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { readSanitizedJsonBody } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const workspaceAppointmentStatusInputSchema = updateAppointmentStatusSchema.extend({
  price_cents: z.number().int().nonnegative().optional(),
});

export async function POST(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);
  if (!user?.id) {
    return NextResponse.json(
      {
        message: 'Debes iniciar sesion para actualizar citas.',
      },
      { status: 401 },
    );
  }

  const body = await readSanitizedJsonBody(request);
  const parsed = workspaceAppointmentStatusInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.flatten().formErrors.join(', ') || 'Datos invalidos.',
      },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: appointment, error: appointmentError } = await admin
    .from('appointments')
    .select('id, shop_id')
    .eq('id', parsed.data.appointment_id)
    .maybeSingle();

  if (appointmentError) {
    return NextResponse.json(
      {
        message: appointmentError.message || 'No se pudo validar la cita.',
      },
      { status: 400 },
    );
  }

  if (!appointment?.id || !appointment.shop_id) {
    return NextResponse.json(
      {
        message: 'La cita ya no existe.',
      },
      { status: 404 },
    );
  }

  const { data: membership, error: membershipError } = await admin
    .from('staff')
    .select('id, role')
    .eq('shop_id', appointment.shop_id)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      {
        message: membershipError.message || 'No se pudo validar tu acceso a la barberia.',
      },
      { status: 400 },
    );
  }

  if (!membership?.id) {
    return NextResponse.json(
      {
        message: 'No tienes acceso a esta barberia.',
      },
      { status: 403 },
    );
  }

  const actorRole = String(membership.role || '').trim() === 'staff' ? 'staff' : 'admin';

  try {
    const result = await updateAppointmentStatusForActor({
      appointmentId: parsed.data.appointment_id,
      status: parsed.data.status,
      actorRole,
      actorUserId: user.id,
      actorStaffId: String(membership.id),
      priceCents: parsed.data.price_cents ?? null,
    });

    return NextResponse.json({
      success: true,
      appointment_id: result.appointmentId,
      shop_id: result.shopId,
      review_link: result.reviewLink,
    });
  } catch (cause) {
    return NextResponse.json(
      {
        message:
          cause instanceof Error ? cause.message : 'No se pudo actualizar el estado de la cita.',
      },
      { status: 400 },
    );
  }
}
