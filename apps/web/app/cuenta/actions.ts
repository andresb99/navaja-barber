'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuthenticated } from '@/lib/auth';
import { getAppointmentReviewAccessForUser } from '@/lib/account-reviews';
import { sanitizeUnknownDeep, sanitizeText } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const submitOwnAppointmentReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid(),
});

export interface SubmitOwnAppointmentReviewActionResult {
  success: boolean;
  error: string | null;
}

export async function submitOwnAppointmentReviewAction(
  input: {
    appointmentId: string;
    rating: number;
    comment?: string | null;
  },
): Promise<SubmitOwnAppointmentReviewActionResult> {
  const ctx = await requireAuthenticated('/cuenta');
  if (ctx.role !== 'user' || !ctx.userId) {
    return {
      success: false,
      error: 'Solo los clientes pueden calificar citas desde su cuenta.',
    };
  }

  const parsed = submitOwnAppointmentReviewSchema.safeParse(sanitizeUnknownDeep(input));
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().formErrors.join(', ') || 'Datos de reseña inválidos.',
    };
  }

  const access = await getAppointmentReviewAccessForUser(ctx.userId, parsed.data.appointmentId);
  if (!access || !access.canReview) {
    return {
      success: false,
      error: 'Esta cita no está disponible para calificación.',
    };
  }

  const admin = createSupabaseAdminClient();
  const submittedAt = new Date().toISOString();
  const { error } = await admin.from('appointment_reviews').insert({
    shop_id: access.appointment.shopId,
    appointment_id: access.appointment.id,
    staff_id: access.appointment.staffId,
    customer_id: access.appointment.customerId,
    rating: parsed.data.rating,
    comment: parsed.data.comment?.trim() || null,
    status: 'published',
    is_verified: true,
    submitted_at: submittedAt,
    published_at: submittedAt,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  if (ctx.userId) {
    await admin
      .from('account_notifications')
      .update({
        is_read: true,
        read_at: submittedAt,
      })
      .eq('user_id', ctx.userId)
      .eq('appointment_id', access.appointment.id)
      .eq('notification_type', 'review_requested')
      .eq('is_read', false);
  }

  revalidatePath('/cuenta');
  revalidatePath(`/cuenta/resenas/${access.appointment.id}`);
  revalidatePath('/admin/metrics');
  revalidatePath(`/admin/performance/${access.appointment.staffId}`);

  return {
    success: true,
    error: null,
  };
}

export async function markAccountNotificationReadAction(input: { notificationId: string }) {
  const ctx = await requireAuthenticated('/cuenta');
  if (!ctx.userId) {
    throw new Error('Debes iniciar sesion para actualizar notificaciones.');
  }

  const parsed = markNotificationReadSchema.safeParse(
    sanitizeUnknownDeep({
      notificationId: sanitizeText(input.notificationId),
    }),
  );
  if (!parsed.success) {
    throw new Error('Notificacion invalida.');
  }

  const admin = createSupabaseAdminClient();
  const readAt = new Date().toISOString();
  const { error } = await admin
    .from('account_notifications')
    .update({
      is_read: true,
      read_at: readAt,
    })
    .eq('id', parsed.data.notificationId)
    .eq('user_id', ctx.userId)
    .eq('is_read', false);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cuenta');
}

export async function markAllAccountNotificationsReadAction() {
  const ctx = await requireAuthenticated('/cuenta');
  if (!ctx.userId) {
    throw new Error('Debes iniciar sesion para actualizar notificaciones.');
  }

  const admin = createSupabaseAdminClient();
  const readAt = new Date().toISOString();
  const { error } = await admin
    .from('account_notifications')
    .update({
      is_read: true,
      read_at: readAt,
    })
    .eq('user_id', ctx.userId)
    .eq('is_read', false);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cuenta');
}
