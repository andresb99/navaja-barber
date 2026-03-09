import 'server-only';

import { normalizeShopBookingPolicy } from '@/lib/booking-policy';
import { env } from '@/lib/env';
import { createMercadoPagoRefund, getMercadoPagoPayment } from '@/lib/mercado-pago.server';
import { trackProductEvent } from '@/lib/product-analytics';
import { createSignedReviewToken } from '@/lib/review-links';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type PaymentIntentStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'expired';

type UpdatableAppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'done';
type WorkspaceActorRole = 'admin' | 'staff';

interface AppointmentAccessRow {
  id: string;
  shop_id: string | null;
  staff_id: string | null;
  payment_intent_id: string | null;
}

interface ShopBookingPolicyRow {
  booking_cancellation_notice_hours: number | null;
  booking_staff_cancellation_refund_mode: string | null;
  booking_cancellation_policy_text: string | null;
}

interface UpdateAppointmentStatusForActorInput {
  appointmentId: string;
  status: UpdatableAppointmentStatus;
  actorRole: WorkspaceActorRole;
  actorUserId: string;
  actorStaffId: string;
  priceCents?: number | null;
}

export interface UpdateAppointmentStatusForActorResult {
  appointmentId: string;
  shopId: string;
  reviewLink: string | null;
}

function isMercadoPagoRefundedStatus(status: string | null | undefined) {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'refunded' || normalized === 'charged_back';
}

async function getAccessibleAppointmentForActor(input: {
  appointmentId: string;
  actorRole: WorkspaceActorRole;
  actorStaffId: string;
}) {
  const admin = createSupabaseAdminClient();

  let query = admin
    .from('appointments')
    .select('id, shop_id, staff_id, payment_intent_id')
    .eq('id', input.appointmentId);

  if (input.actorRole === 'staff') {
    query = query.eq('staff_id', input.actorStaffId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message || 'No se pudo validar la cita.');
  }

  if (!data?.id || !data.shop_id) {
    throw new Error(input.actorRole === 'staff' ? 'No tienes acceso a esta cita.' : 'No se encontro la cita.');
  }

  return data as AppointmentAccessRow;
}

async function refundAppointmentPaymentIfNeeded(input: {
  appointment: AppointmentAccessRow;
  actorRole: WorkspaceActorRole;
  actorUserId: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: shopPolicyRow, error: shopPolicyError } = await admin
    .from('shops')
    .select(
      'booking_cancellation_notice_hours, booking_staff_cancellation_refund_mode, booking_cancellation_policy_text',
    )
    .eq('id', input.appointment.shop_id)
    .maybeSingle();

  if (shopPolicyError) {
    throw new Error(shopPolicyError.message || 'No se pudo validar la politica de reservas.');
  }

  const shopPolicy = normalizeShopBookingPolicy(shopPolicyRow as ShopBookingPolicyRow | null);
  const paymentIntentId = String(input.appointment.payment_intent_id || '').trim();
  if (!paymentIntentId) {
    return;
  }

  const { data: paymentIntent, error: paymentIntentError } = await admin
    .from('payment_intents')
    .select('id, shop_id, status, provider, provider_payment_id, payload')
    .eq('id', paymentIntentId)
    .maybeSingle();

  if (paymentIntentError) {
    throw new Error(paymentIntentError.message || 'No se pudo validar el pago de la cita.');
  }

  if (!paymentIntent?.id) {
    return;
  }

  const paymentIntentShopId = String(paymentIntent.shop_id || '').trim();
  if (paymentIntentShopId && paymentIntentShopId !== input.appointment.shop_id) {
    throw new Error('La cita referencia un pago de otra barberia.');
  }

  const paymentIntentStatus = String(paymentIntent.status || '').trim().toLowerCase() as PaymentIntentStatus;
  if (paymentIntentStatus === 'refunded') {
    return;
  }

  if (paymentIntentStatus === 'approved' && shopPolicy.refundMode === 'manual_review') {
    const manualReviewAt = new Date().toISOString();
    const nextPayload = {
      ...((paymentIntent.payload as Record<string, unknown> | null) || {}),
      manual_refund_review: {
        required: true,
        requested_at: manualReviewAt,
        appointment_id: input.appointment.id,
        cancelled_by: input.actorRole,
      },
    };

    const { error: markManualReviewError } = await admin
      .from('payment_intents')
      .update({
        failure_reason: 'Reserva cancelada; reembolso pendiente de revision manual.',
        payload: nextPayload,
      })
      .eq('id', paymentIntent.id);

    if (markManualReviewError) {
      throw new Error(markManualReviewError.message || 'No se pudo marcar el reembolso manual.');
    }

    void trackProductEvent({
      eventName: 'payment.intent_manual_refund_required',
      shopId: input.appointment.shop_id,
      userId: input.actorUserId,
      source: 'system',
      metadata: {
        payment_intent_id: paymentIntent.id,
        appointment_id: input.appointment.id,
        cancelled_by: input.actorRole,
      },
    });

    return;
  }

  if (paymentIntentStatus === 'pending' || paymentIntentStatus === 'processing') {
    const { error: cancelIntentError } = await admin
      .from('payment_intents')
      .update({
        status: 'cancelled',
        failure_reason: `Reserva cancelada por ${input.actorRole}.`,
        processed_at: new Date().toISOString(),
      })
      .eq('id', paymentIntent.id)
      .in('status', ['pending', 'processing']);

    if (cancelIntentError) {
      throw new Error(cancelIntentError.message || 'No se pudo cancelar el pago pendiente.');
    }

    return;
  }

  if (paymentIntentStatus !== 'approved') {
    return;
  }

  const provider = String(paymentIntent.provider || '').trim().toLowerCase();
  if (provider && provider !== 'mercado_pago') {
    throw new Error('Proveedor de pago no soportado para devolucion automatica.');
  }

  const providerPaymentId = String(paymentIntent.provider_payment_id || '').trim();
  if (!providerPaymentId) {
    throw new Error('No se encontro el identificador del cobro aprobado para devolver el dinero.');
  }

  let providerRefundId: string | null = null;
  try {
    const refund = await createMercadoPagoRefund(providerPaymentId);
    providerRefundId = refund.refundId;
  } catch {
    try {
      const providerPayment = await getMercadoPagoPayment(providerPaymentId);
      if (!isMercadoPagoRefundedStatus(providerPayment.status)) {
        throw new Error('Mercado Pago no reporta el pago como devuelto.');
      }
    } catch {
      throw new Error(
        'No se pudo cancelar la cita porque fallo la devolucion del pago. Intenta nuevamente.',
      );
    }
  }

  const refundedAt = new Date().toISOString();
  const nextPayload = {
    ...((paymentIntent.payload as Record<string, unknown> | null) || {}),
    refund: {
      provider: 'mercado_pago',
      provider_payment_id: providerPaymentId,
      provider_refund_id: providerRefundId,
      cancelled_by: input.actorRole,
      refunded_at: refundedAt,
    },
  };

  const { error: markRefundedError } = await admin
    .from('payment_intents')
    .update({
      status: 'refunded',
      processed_at: refundedAt,
      failure_reason: null,
      payload: nextPayload,
    })
    .eq('id', paymentIntent.id);

  if (markRefundedError) {
    throw new Error(markRefundedError.message || 'No se pudo registrar la devolucion del pago.');
  }

  void trackProductEvent({
    eventName: 'payment.intent_refunded',
    shopId: input.appointment.shop_id,
    userId: input.actorUserId,
    source: 'system',
    metadata: {
      payment_intent_id: paymentIntent.id,
      provider_payment_id: providerPaymentId,
      provider_refund_id: providerRefundId,
      appointment_id: input.appointment.id,
      cancelled_by: input.actorRole,
    },
  });
}

export async function updateAppointmentStatusForActor(
  input: UpdateAppointmentStatusForActorInput,
): Promise<UpdateAppointmentStatusForActorResult> {
  if (input.actorRole === 'staff' && (input.status === 'confirmed' || input.status === 'pending')) {
    throw new Error('Estado no permitido para el equipo.');
  }

  const appointment = await getAccessibleAppointmentForActor({
    appointmentId: input.appointmentId,
    actorRole: input.actorRole,
    actorStaffId: input.actorStaffId,
  });
  const shopId = String(appointment.shop_id || '').trim();

  if (input.status === 'done') {
    const { signedToken, tokenHash } = createSignedReviewToken();
    const sentAt = new Date();
    const expiresAt = new Date(sentAt);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 14);

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('complete_appointment_and_create_review_invite', {
      p_appointment_id: input.appointmentId,
      p_price_cents: input.priceCents ?? null,
      p_token_hash: tokenHash,
      p_sent_at: sentAt.toISOString(),
      p_expires_at: expiresAt.toISOString(),
    });

    if (error) {
      throw new Error(error.message || 'No se pudo marcar la cita como completada.');
    }

    const row = Array.isArray(data)
      ? (data[0] as { review_invite_created?: boolean } | undefined)
      : undefined;

    return {
      appointmentId: input.appointmentId,
      shopId,
      reviewLink:
        row?.review_invite_created === true
          ? `${env.NEXT_PUBLIC_APP_URL}/review/${encodeURIComponent(signedToken)}`
          : null,
    };
  }

  if (input.status === 'cancelled') {
    await refundAppointmentPaymentIfNeeded({
      appointment,
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
    });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('appointments')
    .update({
      status: input.status,
      completed_at: null,
      cancelled_by: input.status === 'cancelled' ? input.actorRole : null,
      cancellation_reason: null,
    })
    .eq('id', input.appointmentId)
    .eq('shop_id', shopId);

  if (error) {
    throw new Error(error.message || 'No se pudo actualizar la cita.');
  }

  return {
    appointmentId: input.appointmentId,
    shopId,
    reviewLink: null,
  };
}
