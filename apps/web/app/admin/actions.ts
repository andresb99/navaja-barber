'use server';

import {
  courseSessionUpsertSchema,
  courseUpsertSchema,
  jobApplicationUpdateSchema,
  modelApplicationStatusUpdateSchema,
  modelRequirementsInputSchema,
  serviceUpsertSchema,
  staffUpsertSchema,
  timeOffUpsertSchema,
  updateAppointmentStatusSchema,
  uuidSchema,
  workingHoursUpsertSchema,
} from '@navaja/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin, requireStaff } from '@/lib/auth';
import { env } from '@/lib/env';
import { createSignedReviewToken } from '@/lib/review-links';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function formValue(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
}

function formDateTimeIso(formData: FormData, key: string): string | undefined {
  const value = formValue(formData, key);
  if (!value) {
    return undefined;
  }

  const normalized = /z$|[+-]\d{2}:\d{2}$/i.test(value) ? value : `${value}:00Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

const markAppointmentCompletedInputSchema = z.object({
  appointmentId: uuidSchema,
  priceCents: z.number().int().nonnegative().optional(),
});

function revalidateAppointmentMetrics() {
  revalidatePath('/staff');
  revalidatePath('/admin/appointments');
  revalidatePath('/admin/metrics');
  revalidatePath('/cuenta');
}

export interface MarkAppointmentCompletedResult {
  reviewLink: string | null;
}

export async function markAppointmentCompletedAction(
  input: { appointmentId: string; priceCents?: number },
): Promise<MarkAppointmentCompletedResult> {
  const ctx = await requireStaff();

  const parsed = markAppointmentCompletedInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de finalizacion invalidos.');
  }

  const { signedToken, tokenHash } = createSignedReviewToken();
  const sentAt = new Date();
  const expiresAt = new Date(sentAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 14);

  const userScopedSupabase = await createSupabaseServerClient();
  const { data: appointment, error: accessError } = await userScopedSupabase
    .from('appointments')
    .select('id')
    .eq('id', parsed.data.appointmentId)
    .eq('shop_id', env.NEXT_PUBLIC_SHOP_ID)
    .single();

  if (accessError || !appointment) {
    throw new Error(ctx.role === 'admin' ? 'No se encontro la cita.' : 'No tienes acceso a esta cita.');
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data, error } = await adminSupabase.rpc('complete_appointment_and_create_review_invite', {
    p_appointment_id: parsed.data.appointmentId,
    p_price_cents: parsed.data.priceCents ?? null,
    p_token_hash: tokenHash,
    p_sent_at: sentAt.toISOString(),
    p_expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data)
    ? (data[0] as { review_invite_created?: boolean } | undefined)
    : undefined;

  revalidateAppointmentMetrics();

  return {
    reviewLink:
      row?.review_invite_created === true
        ? `${env.NEXT_PUBLIC_APP_URL}/review/${encodeURIComponent(signedToken)}`
        : null,
  };
}

export async function upsertStaffAction(formData: FormData) {
  await requireAdmin();

  const parsed = staffUpsertSchema.safeParse({
    id: formValue(formData, 'id'),
    shop_id: formValue(formData, 'shop_id'),
    auth_user_id: formValue(formData, 'auth_user_id') || null,
    name: formValue(formData, 'name'),
    role: formValue(formData, 'role'),
    phone: formValue(formData, 'phone'),
    is_active: formData.get('is_active') === 'on',
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de personal invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  if (parsed.data.id) {
    await supabase.from('staff').update(parsed.data).eq('id', parsed.data.id).eq('shop_id', parsed.data.shop_id);
  } else {
    await supabase.from('staff').insert(parsed.data);
  }

  revalidatePath('/admin/staff');
}

export async function upsertServiceAction(formData: FormData) {
  await requireAdmin();

  const parsed = serviceUpsertSchema.safeParse({
    id: formValue(formData, 'id'),
    shop_id: formValue(formData, 'shop_id'),
    name: formValue(formData, 'name'),
    price_cents: Number(formValue(formData, 'price_cents') || 0),
    duration_minutes: Number(formValue(formData, 'duration_minutes') || 0),
    is_active: formData.get('is_active') === 'on',
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de servicio invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  if (parsed.data.id) {
    await supabase
      .from('services')
      .update(parsed.data)
      .eq('id', parsed.data.id)
      .eq('shop_id', parsed.data.shop_id);
  } else {
    await supabase.from('services').insert(parsed.data);
  }

  revalidatePath('/admin/services');
  revalidatePath('/book');
}

export async function upsertWorkingHoursAction(formData: FormData) {
  await requireAdmin();

  const parsed = workingHoursUpsertSchema.safeParse({
    id: formValue(formData, 'id'),
    shop_id: formValue(formData, 'shop_id'),
    staff_id: formValue(formData, 'staff_id'),
    day_of_week: Number(formValue(formData, 'day_of_week') || -1),
    start_time: formValue(formData, 'start_time'),
    end_time: formValue(formData, 'end_time'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de horario invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  if (parsed.data.id) {
    await supabase
      .from('working_hours')
      .update(parsed.data)
      .eq('id', parsed.data.id)
      .eq('shop_id', parsed.data.shop_id);
  } else {
    await supabase.from('working_hours').insert(parsed.data);
  }

  revalidatePath('/admin/staff');
}

export async function createTimeOffAction(formData: FormData) {
  await requireAdmin();

  const parsed = timeOffUpsertSchema.safeParse({
    shop_id: formValue(formData, 'shop_id'),
    staff_id: formValue(formData, 'staff_id'),
    start_at: formDateTimeIso(formData, 'start_at'),
    end_at: formDateTimeIso(formData, 'end_at'),
    reason: formValue(formData, 'reason') || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de bloqueo invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from('time_off').insert(parsed.data);

  revalidatePath('/admin/staff');
}

export async function updateAppointmentStatusAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateAppointmentStatusSchema.safeParse({
    appointment_id: formValue(formData, 'appointment_id'),
    status: formValue(formData, 'status'),
    price_cents: formValue(formData, 'price_cents') ? Number(formValue(formData, 'price_cents')) : undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de actualizacion de cita invalidos.');
  }

  if (parsed.data.status === 'done') {
    return markAppointmentCompletedAction(
      typeof parsed.data.price_cents === 'number'
        ? {
            appointmentId: parsed.data.appointment_id,
            priceCents: parsed.data.price_cents,
          }
        : {
            appointmentId: parsed.data.appointment_id,
          },
    );
  }

  const supabase = await createSupabaseServerClient();
  const updatePayload: Record<string, unknown> = {
    status: parsed.data.status,
    completed_at: null,
    cancelled_by: parsed.data.status === 'cancelled' ? 'admin' : null,
    cancellation_reason: null,
  };

  const { error } = await supabase
    .from('appointments')
    .update(updatePayload)
    .eq('id', parsed.data.appointment_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAppointmentMetrics();

  return null;
}

export async function upsertCourseAction(formData: FormData) {
  await requireAdmin();

  const parsed = courseUpsertSchema.safeParse({
    id: formValue(formData, 'id'),
    shop_id: formValue(formData, 'shop_id'),
    title: formValue(formData, 'title'),
    description: formValue(formData, 'description'),
    price_cents: Number(formValue(formData, 'price_cents') || 0),
    duration_hours: Number(formValue(formData, 'duration_hours') || 0),
    level: formValue(formData, 'level'),
    is_active: formData.get('is_active') === 'on',
    image_url: formValue(formData, 'image_url') || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de curso invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  if (parsed.data.id) {
    await supabase
      .from('courses')
      .update(parsed.data)
      .eq('id', parsed.data.id)
      .eq('shop_id', parsed.data.shop_id);
  } else {
    await supabase.from('courses').insert(parsed.data);
  }

  revalidatePath('/admin/courses');
  revalidatePath('/courses');
}

export async function upsertCourseSessionAction(formData: FormData) {
  await requireAdmin();

  const parsed = courseSessionUpsertSchema.safeParse({
    id: formValue(formData, 'id'),
    course_id: formValue(formData, 'course_id'),
    start_at: formDateTimeIso(formData, 'start_at'),
    capacity: Number(formValue(formData, 'capacity') || 0),
    location: formValue(formData, 'location'),
    status: formValue(formData, 'status') || 'scheduled',
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de sesion invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  if (parsed.data.id) {
    await supabase.from('course_sessions').update(parsed.data).eq('id', parsed.data.id);
  } else {
    await supabase.from('course_sessions').insert(parsed.data);
  }

  revalidatePath('/admin/courses');
  revalidatePath('/courses');
}

export async function updateJobApplicationAction(formData: FormData) {
  await requireAdmin();

  const parsed = jobApplicationUpdateSchema.safeParse({
    application_id: formValue(formData, 'application_id'),
    status: formValue(formData, 'status'),
    notes: formValue(formData, 'notes') || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de postulacion invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('job_applications')
    .update({ status: parsed.data.status, notes: parsed.data.notes || null })
    .eq('id', parsed.data.application_id);

  revalidatePath('/admin/applicants');
}

export async function upsertModelRequirementsAction(formData: FormData) {
  await requireAdmin();

  const parsed = modelRequirementsInputSchema.safeParse({
    session_id: formValue(formData, 'session_id'),
    models_needed: Number(formValue(formData, 'models_needed') || 0),
    beard_required: formData.get('beard_required') === 'on',
    hair_length_category: formValue(formData, 'hair_length_category') || 'indistinto',
    hair_type: formValue(formData, 'hair_type') || null,
    compensation_type: formValue(formData, 'compensation_type'),
    compensation_value_cents: formValue(formData, 'compensation_value_cents')
      ? Number(formValue(formData, 'compensation_value_cents'))
      : undefined,
    notes_public: formValue(formData, 'notes_public') || null,
    is_open: formData.get('is_open') === 'on',
  });

  const fallbackSessionId = formValue(formData, 'session_id') || '';
  const sessionId = parsed.success ? parsed.data.session_id : fallbackSessionId;
  const redirectBase = `/admin/courses/sessions/${sessionId}/modelos`;

  if (!parsed.success) {
    redirect(`${redirectBase}?error=${encodeURIComponent('No se pudieron guardar los requisitos de modelos.')}`);
  }

  const requirements = {
    models_needed: parsed.data.models_needed,
    beard_required: parsed.data.beard_required || false,
    hair_length_category: parsed.data.hair_length_category || 'indistinto',
    hair_type: parsed.data.hair_type || null,
  };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('model_requirements').upsert(
    {
      session_id: parsed.data.session_id,
      requirements,
      compensation_type: parsed.data.compensation_type,
      compensation_value_cents:
        parsed.data.compensation_type === 'gratis'
          ? null
          : (parsed.data.compensation_value_cents ?? null),
      notes_public: parsed.data.notes_public || null,
      is_open: parsed.data.is_open,
    },
    { onConflict: 'session_id' },
  );

  if (error) {
    redirect(
      `${redirectBase}?error=${encodeURIComponent('No se pudieron guardar los requisitos. Revisa los datos.')}`,
    );
  }

  revalidatePath('/modelos');
  revalidatePath('/modelos/registro');
  revalidatePath(redirectBase);
  redirect(`${redirectBase}?ok=${encodeURIComponent('Requisitos de modelos actualizados.')}`);
}

export async function updateModelApplicationStatusAction(formData: FormData) {
  await requireAdmin();

  const parsed = modelApplicationStatusUpdateSchema.safeParse({
    application_id: formValue(formData, 'application_id'),
    status: formValue(formData, 'status'),
    notes_internal: formValue(formData, 'notes_internal') || null,
  });

  if (!parsed.success) {
    redirect('/admin/modelos?error=No%20se%20pudo%20actualizar%20el%20estado.');
  }

  const supabase = await createSupabaseServerClient();
  const { data: application, error: applicationError } = await supabase
    .from('model_applications')
    .select('id, session_id, status')
    .eq('id', parsed.data.application_id)
    .single();

  if (applicationError || !application) {
    redirect('/admin/modelos?error=No%20se%20encontro%20la%20postulacion.');
  }

  const sessionId = String(application.session_id);
  const redirectBase = `/admin/courses/sessions/${sessionId}/modelos`;

  if (parsed.data.status === 'confirmed' && application.status !== 'confirmed') {
    const { data: requirement } = await supabase
      .from('model_requirements')
      .select('requirements')
      .eq('session_id', sessionId)
      .maybeSingle();

    const modelsNeeded = Number(
      ((requirement?.requirements as Record<string, unknown> | null)?.models_needed as number | undefined) || 0,
    );

    if (modelsNeeded > 0) {
      const { count: confirmedCount } = await supabase
        .from('model_applications')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('status', 'confirmed');

      if ((confirmedCount || 0) >= modelsNeeded) {
        redirect(
          `${redirectBase}?error=${encodeURIComponent('No podes confirmar mas modelos que el cupo definido.')}`,
        );
      }
    }
  }

  const { error } = await supabase
    .from('model_applications')
    .update({
      status: parsed.data.status,
      notes_internal: parsed.data.notes_internal || null,
    })
    .eq('id', parsed.data.application_id);

  if (error) {
    redirect(`${redirectBase}?error=${encodeURIComponent('No se pudo actualizar el estado del modelo.')}`);
  }

  revalidatePath('/admin/modelos');
  revalidatePath(redirectBase);
  redirect(`${redirectBase}?ok=${encodeURIComponent('Estado de postulacion actualizado.')}`);
}

export async function updateModelInternalNotesAction(formData: FormData) {
  await requireAdmin();

  const modelId = formValue(formData, 'model_id');
  if (!modelId) {
    redirect('/admin/modelos?error=Modelo%20invalido.');
  }

  const notes = formValue(formData, 'notes_internal') || null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('models').update({ notes_internal: notes }).eq('id', modelId);

  if (error) {
    redirect('/admin/modelos?error=No%20se%20pudieron%20guardar%20las%20notas.');
  }

  revalidatePath('/admin/modelos');
  redirect(`/admin/modelos?model_id=${modelId}&ok=${encodeURIComponent('Notas internas actualizadas.')}`);
}

export async function updateOwnAppointmentStatusAction(formData: FormData) {
  const ctx = await requireStaff();

  const parsed = updateAppointmentStatusSchema.safeParse({
    appointment_id: formValue(formData, 'appointment_id'),
    status: formValue(formData, 'status'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de actualizacion invalidos.');
  }

  if (!['done', 'no_show', 'cancelled'].includes(parsed.data.status)) {
    throw new Error('Estado no permitido para el equipo.');
  }

  if (parsed.data.status === 'done') {
    await markAppointmentCompletedAction({
      appointmentId: parsed.data.appointment_id,
    });
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('appointments')
    .update({
      status: parsed.data.status,
      completed_at: null,
      cancelled_by: parsed.data.status === 'cancelled' ? 'staff' : null,
      cancellation_reason: null,
    })
    .eq('id', parsed.data.appointment_id)
    .eq('staff_id', ctx.staffId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAppointmentMetrics();
}

