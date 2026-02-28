import 'server-only';
import { headers } from 'next/headers';
import { submitAppointmentReviewInputSchema, type SubmitAppointmentReviewInput } from '@navaja/shared';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { hashOpaqueValue, verifySignedReviewToken } from '@/lib/review-links';

interface ReviewInviteStatusRow {
  appointment_id: string | null;
  staff_id: string | null;
  staff_name: string | null;
  service_name: string | null;
  appointment_start_at: string | null;
  expires_at: string | null;
}

interface SubmittedReviewRow {
  review_id: string | null;
  appointment_id: string | null;
  staff_id: string | null;
  rating: number | null;
  comment: string | null;
  submitted_at: string | null;
  status: string | null;
}

export interface ReviewInvitePreview {
  appointmentId: string;
  staffId: string;
  staffName: string;
  serviceName: string;
  appointmentStartAt: string;
  expiresAt: string;
}

export interface SubmittedAppointmentReview {
  reviewId: string;
  appointmentId: string;
  staffId: string;
  rating: number;
  comment: string | null;
  submittedAt: string;
  status: string;
}

function toPreviewRow(row: ReviewInviteStatusRow | null | undefined): ReviewInvitePreview | null {
  if (!row?.appointment_id || !row.staff_id || !row.appointment_start_at || !row.expires_at) {
    return null;
  }

  return {
    appointmentId: String(row.appointment_id),
    staffId: String(row.staff_id),
    staffName: String(row.staff_name || 'Barbero'),
    serviceName: String(row.service_name || 'Servicio'),
    appointmentStartAt: String(row.appointment_start_at),
    expiresAt: String(row.expires_at),
  };
}

export async function getReviewInvitePreview(signedToken: string): Promise<ReviewInvitePreview | null> {
  const rawToken = verifySignedReviewToken(signedToken);
  if (!rawToken) {
    return null;
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc('get_review_invite_status', {
    p_token: rawToken,
  });

  if (error) {
    return null;
  }

  const row = Array.isArray(data) ? (data[0] as ReviewInviteStatusRow | undefined) : undefined;
  return toPreviewRow(row);
}

export async function submitAppointmentReview(
  input: SubmitAppointmentReviewInput,
): Promise<SubmittedAppointmentReview> {
  const parsed = submitAppointmentReviewInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de resena invalidos.');
  }

  const rawToken = verifySignedReviewToken(parsed.data.signed_token);
  if (!rawToken) {
    throw new Error('El enlace de resena no es valido.');
  }

  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0]?.trim() : null;
  const userAgent = headerStore.get('user-agent');

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc('submit_appointment_review', {
    p_token: rawToken,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment?.trim() || null,
    p_ip_hash: hashOpaqueValue(ipAddress),
    p_user_agent_hash: hashOpaqueValue(userAgent),
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? (data[0] as SubmittedReviewRow | undefined) : undefined;
  if (!row?.review_id || !row.appointment_id || !row.staff_id || !row.submitted_at || !row.status) {
    throw new Error('No se pudo guardar la resena.');
  }

  return {
    reviewId: String(row.review_id),
    appointmentId: String(row.appointment_id),
    staffId: String(row.staff_id),
    rating: Math.max(1, Math.min(5, Math.round(Number(row.rating || 0)))),
    comment: row.comment?.trim() || null,
    submittedAt: String(row.submitted_at),
    status: String(row.status),
  };
}
