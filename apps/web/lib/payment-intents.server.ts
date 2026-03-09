import 'server-only';

import { createAppointmentFromBookingIntent, type BookingIntentPayload } from '@/lib/booking-payments.server';
import {
  createCourseEnrollmentFromIntent,
  type CourseEnrollmentIntentPayload,
} from '@/lib/course-payments.server';
import {
  getMercadoPagoPayment,
  searchLatestMercadoPagoPaymentByExternalReference,
  type MercadoPagoPaymentResponse,
} from '@/lib/mercado-pago.server';
import { trackProductEvent } from '@/lib/product-analytics';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SubscriptionBillingMode, SubscriptionTier } from '@/lib/subscription-plans';

export type PaymentIntentStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'expired';

export interface PaymentIntentRow {
  id: string;
  shop_id: string | null;
  intent_type: 'booking' | 'subscription' | 'course_enrollment';
  status: PaymentIntentStatus;
  external_reference: string;
  processed_at: string | null;
  provider_payment_id: string | null;
  created_by_user_id: string | null;
  payload: Record<string, unknown> | null;
}

export interface PaymentIntentSyncResult {
  ok: true;
  ignored?: boolean;
  processed?: boolean;
  status?: PaymentIntentStatus;
  paymentIntentId?: string;
  providerPaymentId?: string;
  externalReference?: string;
}

function getNextSubscriptionPeriodEnd(billingMode: SubscriptionBillingMode) {
  const next = new Date();
  if (billingMode === 'annual_installments') {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }

  return next.toISOString();
}

export function mapMercadoPagoStatus(status: string | undefined): PaymentIntentStatus {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'approved') {
    return 'approved';
  }

  if (normalized === 'pending' || normalized === 'in_process') {
    return 'processing';
  }

  if (normalized === 'rejected') {
    return 'rejected';
  }

  if (normalized === 'cancelled') {
    return 'cancelled';
  }

  if (normalized === 'refunded' || normalized === 'charged_back') {
    return 'refunded';
  }

  return 'pending';
}

async function markIntentBaseState(
  intentId: string,
  update: {
    status: PaymentIntentStatus;
    providerPaymentId: string;
    payerEmail: string | null;
    failureReason?: string | null;
    approvedAt?: string | null;
  },
) {
  const admin = createSupabaseAdminClient();
  await admin
    .from('payment_intents')
    .update({
      status: update.status,
      provider_payment_id: update.providerPaymentId,
      payer_email: update.payerEmail,
      failure_reason: update.failureReason || null,
      approved_at: update.approvedAt || null,
    })
    .eq('id', intentId);
}

async function processBookingIntent(intent: PaymentIntentRow, providerPaymentId: string, payerEmail: string | null) {
  const bookingPayload = intent.payload as (BookingIntentPayload & {
    source_channel?: string | null;
    created_by_user_email?: string | null;
  }) | null;
  if (!bookingPayload) {
    throw new Error('El payment intent de reserva no contiene payload de booking.');
  }

  const requestedSourceChannel =
    String(bookingPayload.source_channel || '').trim().toUpperCase() === 'MOBILE'
      ? 'MOBILE'
      : 'WEB';
  const requestedUserEmail = String(bookingPayload.created_by_user_email || '').trim().toLowerCase() || null;

  const appointment = await createAppointmentFromBookingIntent(
    {
      shop_id: String(bookingPayload.shop_id || ''),
      service_id: String(bookingPayload.service_id || ''),
      staff_id: String(bookingPayload.staff_id || ''),
      start_at: String(bookingPayload.start_at || ''),
      customer_name: String(bookingPayload.customer_name || ''),
      customer_phone: String(bookingPayload.customer_phone || ''),
      customer_email:
        typeof bookingPayload.customer_email === 'string' ? bookingPayload.customer_email : null,
      notes: typeof bookingPayload.notes === 'string' ? bookingPayload.notes : null,
    },
    {
      paymentIntentId: intent.id,
      sourceChannel: requestedSourceChannel,
      customerAuthUserId: intent.created_by_user_id,
      customerAuthUserEmail: requestedUserEmail,
    },
  );

  const admin = createSupabaseAdminClient();
  await admin
    .from('payment_intents')
    .update({
      status: 'approved',
      provider_payment_id: providerPaymentId,
      payer_email: payerEmail,
      approved_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      payload: {
        ...(intent.payload || {}),
        appointment_id: appointment.appointmentId,
        appointment_start_at: appointment.startAt,
      },
    })
    .eq('id', intent.id);
}

async function processSubscriptionIntent(
  intent: PaymentIntentRow,
  providerPaymentId: string,
  payerEmail: string | null,
) {
  const rawPayload = (intent.payload || {}) as {
    target_plan?: SubscriptionTier;
    billing_mode?: SubscriptionBillingMode;
    shop_id?: string;
  };
  const targetPlan = rawPayload.target_plan;
  const billingMode = rawPayload.billing_mode || 'monthly';
  const shopId = String(rawPayload.shop_id || intent.shop_id || '').trim();

  if (!shopId || !targetPlan) {
    throw new Error('Payload de suscripcion invalido.');
  }

  const admin = createSupabaseAdminClient();
  const periodEnd = getNextSubscriptionPeriodEnd(billingMode);

  const { error: subscriptionError } = await admin
    .from('subscriptions')
    .update({
      plan: targetPlan,
      status: 'active',
      trial_ends_at: null,
      current_period_end: periodEnd,
    })
    .eq('shop_id', shopId);

  if (subscriptionError) {
    throw new Error(subscriptionError.message || 'No se pudo activar la suscripcion.');
  }

  await admin
    .from('payment_intents')
    .update({
      status: 'approved',
      provider_payment_id: providerPaymentId,
      payer_email: payerEmail,
      approved_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      payload: {
        ...(intent.payload || {}),
        activated_plan: targetPlan,
        activated_at: new Date().toISOString(),
      },
    })
    .eq('id', intent.id);
}

async function processCourseEnrollmentIntent(
  intent: PaymentIntentRow,
  providerPaymentId: string,
  payerEmail: string | null,
) {
  const rawPayload = (intent.payload || {}) as {
    shop_id?: string;
    course_id?: string;
    course_title?: string;
    session_id?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
  };

  const enrollment = await createCourseEnrollmentFromIntent(
    {
      shop_id: String(rawPayload.shop_id || intent.shop_id || ''),
      course_id: String(rawPayload.course_id || ''),
      course_title: String(rawPayload.course_title || 'Curso'),
      session_id: String(rawPayload.session_id || ''),
      name: String(rawPayload.customer_name || ''),
      phone: String(rawPayload.customer_phone || ''),
      email: String(rawPayload.customer_email || payerEmail || ''),
    } satisfies CourseEnrollmentIntentPayload,
    { paymentIntentId: intent.id },
  );

  const admin = createSupabaseAdminClient();
  await admin
    .from('payment_intents')
    .update({
      status: 'approved',
      provider_payment_id: providerPaymentId,
      payer_email: payerEmail,
      approved_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      payload: {
        ...(intent.payload || {}),
        enrollment_id: enrollment.enrollmentId,
        enrolled_at: new Date().toISOString(),
      },
    })
    .eq('id', intent.id);
}

async function applyMercadoPagoPaymentToIntent(intent: PaymentIntentRow, payment: MercadoPagoPaymentResponse) {
  const mappedStatus = mapMercadoPagoStatus(payment.status);
  const providerPaymentId = String(payment.id || '').trim();
  const payerEmail = String(payment.payer?.email || '').trim() || null;
  const failureReason = mappedStatus === 'approved' ? null : String(payment.status_detail || '').trim() || null;

  await markIntentBaseState(intent.id, {
    status: mappedStatus,
    providerPaymentId,
    payerEmail,
    failureReason,
    approvedAt: mappedStatus === 'approved' ? new Date().toISOString() : null,
  });

  void trackProductEvent({
    eventName: 'payment.intent_status_updated',
    shopId: intent.shop_id,
    userId: intent.created_by_user_id,
    source: 'system',
    metadata: {
      payment_intent_id: intent.id,
      intent_type: intent.intent_type,
      status: mappedStatus,
      provider_payment_id: providerPaymentId,
    },
  });

  if (mappedStatus !== 'approved') {
    return {
      ok: true,
      status: mappedStatus,
      paymentIntentId: intent.id,
      providerPaymentId,
      externalReference: intent.external_reference,
    } satisfies PaymentIntentSyncResult;
  }

  if (intent.processed_at) {
    return {
      ok: true,
      processed: true,
      status: mappedStatus,
      paymentIntentId: intent.id,
      providerPaymentId,
      externalReference: intent.external_reference,
    } satisfies PaymentIntentSyncResult;
  }

  if (intent.intent_type === 'booking') {
    await processBookingIntent(intent, providerPaymentId, payerEmail);
  } else if (intent.intent_type === 'course_enrollment') {
    await processCourseEnrollmentIntent(intent, providerPaymentId, payerEmail);
  } else {
    await processSubscriptionIntent(intent, providerPaymentId, payerEmail);
  }

  void trackProductEvent({
    eventName: 'payment.intent_processed',
    shopId: intent.shop_id,
    userId: intent.created_by_user_id,
    source: 'system',
    metadata: {
      payment_intent_id: intent.id,
      intent_type: intent.intent_type,
      status: 'approved',
    },
  });

  return {
    ok: true,
    status: 'approved',
    paymentIntentId: intent.id,
    providerPaymentId,
    externalReference: intent.external_reference,
  } satisfies PaymentIntentSyncResult;
}

export async function processMercadoPagoPaymentWebhook(paymentId: string): Promise<PaymentIntentSyncResult> {
  const payment = await getMercadoPagoPayment(paymentId);
  const externalReference = String(payment.external_reference || '').trim();

  if (!externalReference) {
    return { ok: true, ignored: true };
  }

  const admin = createSupabaseAdminClient();
  const { data: paymentIntent } = await admin
    .from('payment_intents')
    .select(
      'id, shop_id, intent_type, status, external_reference, processed_at, provider_payment_id, created_by_user_id, payload',
    )
    .eq('external_reference', externalReference)
    .maybeSingle();

  if (!paymentIntent) {
    return { ok: true, ignored: true };
  }

  return applyMercadoPagoPaymentToIntent(paymentIntent as PaymentIntentRow, payment);
}

export async function reconcileMercadoPagoPaymentIntents(options?: {
  limit?: number;
  shopId?: string | null;
}) {
  const limit = Math.max(1, Math.min(Number(options?.limit || 25), 100));
  const admin = createSupabaseAdminClient();
  let query = admin
    .from('payment_intents')
    .select(
      'id, shop_id, intent_type, status, external_reference, processed_at, provider_payment_id, created_by_user_id, payload',
    )
    .eq('provider', 'mercado_pago')
    .in('status', ['pending', 'processing', 'approved'])
    .order('created_at', { ascending: true })
    .limit(limit);

  const shopId = String(options?.shopId || '').trim();
  if (shopId) {
    query = query.eq('shop_id', shopId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'No se pudieron consultar payment intents para reconciliar.');
  }

  const intents = (data || []) as PaymentIntentRow[];
  const results: PaymentIntentSyncResult[] = [];

  for (const intent of intents) {
    if (intent.status === 'approved' && intent.processed_at) {
      results.push({
        ok: true,
        ignored: true,
        status: intent.status,
        paymentIntentId: intent.id,
        externalReference: intent.external_reference,
      });
      continue;
    }

    const providerPaymentId = String(intent.provider_payment_id || '').trim();
    const payment = providerPaymentId
      ? await getMercadoPagoPayment(providerPaymentId).catch(() => null)
      : await searchLatestMercadoPagoPaymentByExternalReference(intent.external_reference).catch(() => null);

    if (!payment) {
      results.push({
        ok: true,
        ignored: true,
        status: intent.status,
        paymentIntentId: intent.id,
        externalReference: intent.external_reference,
      });
      continue;
    }

    results.push(await applyMercadoPagoPaymentToIntent(intent, payment));
  }

  return results;
}
