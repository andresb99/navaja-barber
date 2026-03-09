import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

interface RawAccountAppointmentRow {
  id: string | null;
  shop_id: string | null;
  customer_id: string | null;
  staff_id: string | null;
  start_at: string | null;
  status: string | null;
  payment_intent_id: string | null;
  services: { name?: string } | null;
  staff: { name?: string } | null;
}

interface RawAppointmentReviewRow {
  id: string | null;
  appointment_id: string | null;
  rating: number | null;
  comment: string | null;
  submitted_at: string | null;
}

export interface AccountAppointmentItem {
  id: string;
  shopId: string;
  customerId: string;
  staffId: string;
  startAt: string;
  status: string;
  paymentStatus: string | null;
  serviceName: string;
  staffName: string;
  hasReview: boolean;
  reviewRating: number | null;
}

export interface AccountAppointmentReviewAccess {
  appointment: AccountAppointmentItem;
  existingReview: {
    id: string;
    rating: number;
    comment: string | null;
    submittedAt: string;
  } | null;
  canReview: boolean;
}

function mapAppointmentRow(
  row: RawAccountAppointmentRow,
  reviewsByAppointmentId: Map<string, RawAppointmentReviewRow>,
  paymentStatusByIntentId: Map<string, string>,
): AccountAppointmentItem | null {
  if (!row.id || !row.shop_id || !row.customer_id || !row.staff_id || !row.start_at) {
    return null;
  }

  const existingReview = reviewsByAppointmentId.get(String(row.id));
  const paymentIntentId = String(row.payment_intent_id || '').trim();

  return {
    id: String(row.id),
    shopId: String(row.shop_id),
    customerId: String(row.customer_id),
    staffId: String(row.staff_id),
    startAt: String(row.start_at),
    status: String(row.status || 'pending'),
    paymentStatus: paymentIntentId ? paymentStatusByIntentId.get(paymentIntentId) || null : null,
    serviceName: String(row.services?.name || 'Servicio'),
    staffName: String(row.staff?.name || 'Barbero'),
    hasReview: Boolean(existingReview?.id),
    reviewRating:
      typeof existingReview?.rating === 'number'
        ? Math.max(1, Math.min(5, Math.round(existingReview.rating)))
        : null,
  };
}

async function listLinkedCustomerIds(userId: string) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('customer_auth_links')
    .select('customer_id')
    .eq('user_id', normalizedUserId);

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(
    new Set(
      (data || [])
        .map((item) => String((item as { customer_id?: string | null }).customer_id || '').trim())
        .filter(Boolean),
    ),
  );
}

async function fetchAccountAppointmentsRaw(customerIds: string[]) {
  if (!customerIds.length) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('appointments')
    .select('id, shop_id, customer_id, staff_id, start_at, status, payment_intent_id, services(name), staff(name)')
    .in('customer_id', customerIds)
    .order('start_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as RawAccountAppointmentRow[];
}

async function fetchPaymentStatusesForIntents(paymentIntentIds: string[]) {
  if (!paymentIntentIds.length) {
    return new Map<string, string>();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('payment_intents')
    .select('id, status')
    .in('id', paymentIntentIds);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as Array<{ id?: string | null; status?: string | null }>).reduce(
    (acc, item) => {
      const intentId = String(item.id || '').trim();
      const status = String(item.status || '').trim();
      if (intentId && status) {
        acc.set(intentId, status);
      }
      return acc;
    },
    new Map<string, string>(),
  );
}

async function fetchReviewsForAppointments(appointmentIds: string[]) {
  if (!appointmentIds.length) {
    return new Map<string, RawAppointmentReviewRow>();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('appointment_reviews')
    .select('id, appointment_id, rating, comment, submitted_at')
    .in('appointment_id', appointmentIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).reduce((acc, item) => {
    const appointmentId = String(item.appointment_id || '');
    if (appointmentId) {
      acc.set(appointmentId, item as RawAppointmentReviewRow);
    }
    return acc;
  }, new Map<string, RawAppointmentReviewRow>());
}

export async function getAccountAppointments(userId: string): Promise<AccountAppointmentItem[]> {
  const customerIds = await listLinkedCustomerIds(userId);
  const appointments = await fetchAccountAppointmentsRaw(customerIds);
  const paymentStatusByIntentId = await fetchPaymentStatusesForIntents(
    appointments
      .map((item) => String(item.payment_intent_id || '').trim())
      .filter(Boolean),
  );
  const reviewsByAppointmentId = await fetchReviewsForAppointments(
    appointments.map((item) => String(item.id || '')).filter(Boolean),
  );

  return appointments
    .map((item) => mapAppointmentRow(item, reviewsByAppointmentId, paymentStatusByIntentId))
    .filter((item): item is AccountAppointmentItem => item !== null);
}

export async function getAppointmentReviewAccessForUser(
  userId: string,
  appointmentId: string,
): Promise<AccountAppointmentReviewAccess | null> {
  const customerIds = await listLinkedCustomerIds(userId);
  if (!customerIds.length) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('appointments')
    .select('id, shop_id, customer_id, staff_id, start_at, status, payment_intent_id, services(name), staff(name)')
    .eq('id', appointmentId)
    .in('customer_id', customerIds)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const { data: review, error: reviewError } = await admin
    .from('appointment_reviews')
    .select('id, appointment_id, rating, comment, submitted_at')
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  if (reviewError) {
    throw new Error(reviewError.message);
  }

  const reviewsByAppointmentId = new Map<string, RawAppointmentReviewRow>();
  if (review) {
    reviewsByAppointmentId.set(appointmentId, review as RawAppointmentReviewRow);
  }
  const paymentStatusByIntentId = await fetchPaymentStatusesForIntents(
    [String((data as RawAccountAppointmentRow).payment_intent_id || '').trim()].filter(Boolean),
  );
  const appointment = mapAppointmentRow(
    data as RawAccountAppointmentRow,
    reviewsByAppointmentId,
    paymentStatusByIntentId,
  );
  if (!appointment) {
    return null;
  }

  return {
    appointment,
    existingReview: review?.id
      ? {
          id: String(review.id),
          rating: Math.max(1, Math.min(5, Math.round(Number(review.rating || 0)))),
          comment: ((review.comment as string | null) || null)?.trim() || null,
          submittedAt: String(review.submitted_at || ''),
        }
      : null,
    canReview: appointment.status === 'done' && !review?.id,
  };
}
