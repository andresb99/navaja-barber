import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAppointmentReviewAccessForUser } from '@/lib/account-reviews';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { trackProductEvent } from '@/lib/product-analytics';
import { readSanitizedJsonBody, sanitizeText } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const payloadSchema = z.object({
  appointment_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const user = await resolveAuthenticatedUser(request);

  if (!user?.id) {
    return NextResponse.json(
      {
        message: 'Debes iniciar sesion para enviar una reseña.',
      },
      { status: 401 },
    );
  }

  const payload = payloadSchema.safeParse(await readSanitizedJsonBody(request));
  if (!payload.success) {
    return NextResponse.json(
      {
        message: payload.error.flatten().formErrors.join(', ') || 'Datos de reseña invalidos.',
      },
      { status: 400 },
    );
  }

  try {
    const access = await getAppointmentReviewAccessForUser(user.id, payload.data.appointment_id);
    if (!access || !access.canReview) {
      return NextResponse.json(
        {
          message: 'Esta cita no esta disponible para calificacion.',
        },
        { status: 400 },
      );
    }

    const submittedAt = new Date().toISOString();
    const admin = createSupabaseAdminClient();
    const { data: review, error } = await admin
      .from('appointment_reviews')
      .insert({
        shop_id: access.appointment.shopId,
        appointment_id: access.appointment.id,
        staff_id: access.appointment.staffId,
        customer_id: access.appointment.customerId,
        rating: payload.data.rating,
        comment: sanitizeText(payload.data.comment, { maxLength: 1000 }) || null,
        status: 'published',
        is_verified: true,
        submitted_at: submittedAt,
        published_at: submittedAt,
      })
      .select('id')
      .single();

    if (error || !review) {
      return NextResponse.json(
        {
          message: error?.message || 'No se pudo guardar la reseña.',
        },
        { status: 400 },
      );
    }

    await admin
      .from('account_notifications')
      .update({
        is_read: true,
        read_at: submittedAt,
      })
      .eq('user_id', user.id)
      .eq('appointment_id', payload.data.appointment_id)
      .eq('notification_type', 'review_requested')
      .eq('is_read', false);

    void trackProductEvent({
      eventName: 'account.review_submitted',
      shopId: access.appointment.shopId,
      userId: user.id,
      customerId: access.appointment.customerId,
      source: 'web',
      metadata: {
        review_id: String(review.id),
        appointment_id: access.appointment.id,
        staff_id: access.appointment.staffId,
        rating: payload.data.rating,
      },
    });

    return NextResponse.json({
      success: true,
      review_id: String(review.id),
    });
  } catch (cause) {
    return NextResponse.json(
      {
        message: cause instanceof Error ? cause.message : 'No se pudo guardar la reseña.',
      },
      { status: 400 },
    );
  }
}
