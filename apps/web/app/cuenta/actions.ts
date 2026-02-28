'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuthenticated } from '@/lib/auth';
import { getAppointmentReviewAccessForUser } from '@/lib/account-reviews';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const submitOwnAppointmentReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
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
  if (ctx.role !== 'user' || !ctx.email) {
    return {
      success: false,
      error: 'Solo los clientes pueden calificar citas desde su cuenta.',
    };
  }

  const parsed = submitOwnAppointmentReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().formErrors.join(', ') || 'Datos de reseña inválidos.',
    };
  }

  const access = await getAppointmentReviewAccessForUser(ctx.email, parsed.data.appointmentId);
  if (!access || !access.canReview) {
    return {
      success: false,
      error: 'Esta cita no está disponible para calificación.',
    };
  }

  const admin = createSupabaseAdminClient();
  const submittedAt = new Date().toISOString();
  const { error } = await admin.from('appointment_reviews').insert({
    shop_id: SHOP_ID,
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

  revalidatePath('/cuenta');
  revalidatePath(`/cuenta/resenas/${access.appointment.id}`);
  revalidatePath('/admin/metrics');
  revalidatePath(`/admin/performance/${access.appointment.staffId}`);

  return {
    success: true,
    error: null,
  };
}
