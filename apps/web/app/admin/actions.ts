'use server';

import { randomUUID } from 'node:crypto';
import {
  bookingInputSchema,
  parseCurrencyInputToCents,
  courseSessionUpsertSchema,
  courseUpsertSchema,
  jobApplicationUpdateSchema,
  modelApplicationStatusUpdateSchema,
  modelRequirementsInputSchema,
  serviceUpsertSchema,
  staffRoleSchema,
  staffUpsertSchema,
  timeOffUpsertSchema,
  updateAppointmentStatusSchema,
  uuidSchema,
  workingHoursUpsertSchema,
} from '@navaja/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentAuthContext, requireAdmin, requireAuthenticated, requireStaff } from '@/lib/auth';
import { env } from '@/lib/env';
import { updateAppointmentStatusForActor } from '@/lib/appointment-status.server';
import { createSignedReviewToken } from '@/lib/review-links';
import { createAppointmentFromBookingIntent } from '@/lib/booking-payments.server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { markPendingTimeOffReason } from '@/lib/time-off-requests';
import { buildAdminHref } from '@/lib/workspace-routes';
import { sanitizeText } from '@/lib/sanitize';
import { reviewPendingTimeOffRequest } from '@/lib/admin-time-off';

const PUBLIC_ASSETS_BUCKET = 'public-assets';
const MAX_COURSE_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_COURSE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function formValue(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  return sanitizeText(raw);
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

function parseIntegerValue(value?: string): number {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    return Number.NaN;
  }

  return numeric;
}

function parsePriceCentsValue(value?: string): number {
  if (!value) {
    return 0;
  }

  const cents = parseCurrencyInputToCents(value);
  if (!Number.isFinite(cents) || !Number.isInteger(cents) || cents < 0) {
    return Number.NaN;
  }

  return cents;
}

function normalizeStringArray(values: unknown[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const sanitized = sanitizeText(value);
    if (!sanitized) {
      continue;
    }

    const dedupeKey = sanitized.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(sanitized);
  }

  return normalized;
}

function formStringArray(formData: FormData, key: string): string[] {
  return normalizeStringArray(formData.getAll(key));
}

function unknownStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return normalizeStringArray(input);
}

function isBucketAlreadyExistsError(error: unknown) {
  if (!error) {
    return false;
  }

  const maybeError = error as { statusCode?: number | string; status?: number | string; message?: string };
  const statusCode = String(maybeError.statusCode ?? maybeError.status ?? '').trim();
  const message = String(maybeError.message || error || '').toLowerCase();

  return statusCode === '409' || message.includes('already exists') || message.includes('duplicate');
}

async function ensurePublicAssetsBucket(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const { error } = await admin.storage.createBucket(PUBLIC_ASSETS_BUCKET, {
    public: true,
    allowedMimeTypes: Array.from(ALLOWED_COURSE_IMAGE_TYPES),
    fileSizeLimit: `${MAX_COURSE_IMAGE_SIZE}`,
  });

  if (error && !isBucketAlreadyExistsError(error)) {
    throw new Error(error.message || 'No se pudo preparar el bucket de imagenes.');
  }
}

function sanitizeStorageFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function getImageFileExtension(file: File) {
  if (file.name.includes('.')) {
    const fromName = file.name.split('.').pop()?.trim().toLowerCase();
    if (fromName) {
      return fromName;
    }
  }

  if (file.type === 'image/png') {
    return 'png';
  }

  if (file.type === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function parsePublicAssetsStoragePath(publicUrl: string | null | undefined) {
  const normalized = String(publicUrl || '').trim();
  if (!normalized) {
    return null;
  }

  const marker = `/storage/v1/object/public/${PUBLIC_ASSETS_BUCKET}/`;
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const storagePath = normalized.slice(markerIndex + marker.length).trim();
  return storagePath || null;
}

function getValidationErrorMessage(
  error: z.ZodError,
  fallback: string,
  fieldLabels?: Record<string, string>,
) {
  const flattened = error.flatten();
  const formErrors = flattened.formErrors.filter(Boolean);
  const fieldErrors = Object.entries(flattened.fieldErrors)
    .flatMap(([field, messages]) =>
      (messages || [])
        .filter(Boolean)
        .map((message) => `${fieldLabels?.[field] || field}: ${message}`),
    );
  const messages = [...formErrors, ...fieldErrors];

  return messages.join(', ') || fallback;
}

const markAppointmentCompletedInputSchema = z.object({
  appointmentId: uuidSchema,
  shopId: uuidSchema,
  priceCents: z.number().int().nonnegative().optional(),
});
const manualAppointmentSourceSchema = z.enum(['WALK_IN', 'ADMIN_CREATED']);

const workingHoursRangeUpsertSchema = z
  .object({
    shop_id: uuidSchema,
    staff_id: uuidSchema,
    day_from: z
      .number()
      .int()
      .min(0, 'Selecciona un dia inicial valido.')
      .max(6, 'Selecciona un dia inicial valido.'),
    day_to: z
      .number()
      .int()
      .min(0, 'Selecciona un dia final valido.')
      .max(6, 'Selecciona un dia final valido.'),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Ingresa una hora de inicio valida.'),
    end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Ingresa una hora de fin valida.'),
    replace_existing: z.boolean().default(true),
  })
  .refine((value) => value.start_time < value.end_time, {
    message: 'La hora de fin debe ser posterior a la hora de inicio.',
    path: ['end_time'],
  });

function requireFormShopId(formData: FormData) {
  const parsed = uuidSchema.safeParse(formValue(formData, 'shop_id'));
  if (!parsed.success) {
    throw new Error('No se recibio una barberia valida para esta accion.');
  }

  return parsed.data;
}

function requireFormShopSlug(formData: FormData) {
  return formValue(formData, 'shop_slug') || undefined;
}

function resolveWeekdayRange(dayFrom: number, dayTo: number) {
  if (dayFrom <= dayTo) {
    return Array.from({ length: dayTo - dayFrom + 1 }, (_, index) => dayFrom + index);
  }

  return [
    ...Array.from({ length: 7 - dayFrom }, (_, index) => dayFrom + index),
    ...Array.from({ length: dayTo + 1 }, (_, index) => index),
  ];
}

function getUserDisplayName(
  email: string | null | undefined,
  profile?: { full_name?: string | null } | null,
  metadata?: Record<string, unknown> | null,
) {
  const profileName =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) || null;
  const metadataName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    null;

  return profileName || metadataName || email || 'Usuario';
}

async function findAuthUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  let page = 1;
  const perPage = 200;

  while (true) {
    const result = await admin.auth.admin.listUsers({ page, perPage });
    if (result.error) {
      throw new Error(result.error.message);
    }

    const matchedUser =
      result.data.users.find((user) => String(user.email || '').trim().toLowerCase() === normalizedEmail) ||
      null;

    if (matchedUser?.id) {
      const { data: profile } = await admin
        .from('user_profiles')
        .select('full_name, phone, avatar_url')
        .eq('auth_user_id', matchedUser.id)
        .maybeSingle();

      const metadata =
        (matchedUser.user_metadata as Record<string, unknown> | null | undefined) || null;

      return {
        userId: matchedUser.id,
        email: String(matchedUser.email || normalizedEmail),
        fullName: getUserDisplayName(matchedUser.email, profile, metadata),
        phone:
          (typeof profile?.phone === 'string' && profile.phone.trim()) ||
          null,
        avatarUrl:
          (typeof profile?.avatar_url === 'string' && profile.avatar_url.trim()) ||
          (typeof metadata?.avatar_url === 'string' && metadata.avatar_url.trim()) ||
          (typeof metadata?.picture === 'string' && metadata.picture.trim()) ||
          null,
      };
    }

    if (!result.data.users.length || (result.data.lastPage && page >= result.data.lastPage)) {
      break;
    }

    page += 1;
  }

  return null;
}

export interface StaffInviteLookupResult {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
}

async function findAuthUsersByQuery(query: string, limit = 6): Promise<StaffInviteLookupResult[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  let page = 1;
  const perPage = 200;
  const matches: Array<{
    userId: string;
    email: string;
    metadata: Record<string, unknown> | null;
  }> = [];
  const seenUserIds = new Set<string>();

  while (matches.length < limit) {
    const result = await admin.auth.admin.listUsers({ page, perPage });
    if (result.error) {
      throw new Error(result.error.message);
    }

    for (const user of result.data.users) {
      const userId = String(user.id || '');
      const email = String(user.email || '').trim();
      const metadata = (user.user_metadata as Record<string, unknown> | null | undefined) || null;
      const metadataName =
        (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
        (typeof metadata?.name === 'string' && metadata.name.trim()) ||
        '';
      const haystack = `${email.toLowerCase()} ${metadataName.toLowerCase()}`.trim();

      if (!userId || !email || seenUserIds.has(userId) || !haystack.includes(normalizedQuery)) {
        continue;
      }

      seenUserIds.add(userId);
      matches.push({
        userId,
        email,
        metadata,
      });

      if (matches.length >= limit) {
        break;
      }
    }

    if (!result.data.users.length || (result.data.lastPage && page >= result.data.lastPage)) {
      break;
    }

    page += 1;
  }

  if (!matches.length) {
    return [];
  }

  const { data: profiles } = await admin
    .from('user_profiles')
    .select('auth_user_id, full_name, phone, avatar_url')
    .in(
      'auth_user_id',
      matches.map((item) => item.userId),
    );
  const profilesByUserId = new Map(
    (profiles || []).map((item) => [String(item.auth_user_id), item]),
  );

  return matches.map((item) => {
    const profile = profilesByUserId.get(item.userId) as
      | { full_name?: string | null; phone?: string | null; avatar_url?: string | null }
      | undefined;

    return {
      userId: item.userId,
      email: item.email,
      fullName: getUserDisplayName(item.email, profile || null, item.metadata),
      phone: (typeof profile?.phone === 'string' && profile.phone.trim()) || null,
      avatarUrl:
        (typeof profile?.avatar_url === 'string' && profile.avatar_url.trim()) ||
        (typeof item.metadata?.avatar_url === 'string' && item.metadata.avatar_url.trim()) ||
        (typeof item.metadata?.picture === 'string' && item.metadata.picture.trim()) ||
        null,
    };
  });
}

export async function searchStaffInviteeAction(input: {
  shopId: string;
  query: string;
}): Promise<StaffInviteLookupResult[]> {
  const parsed = z
    .object({
      shopId: uuidSchema,
      query: z.string().trim().min(2).max(160),
    })
    .safeParse(input);

  if (!parsed.success) {
    return [];
  }

  await requireAdmin({ shopId: parsed.data.shopId });
  return findAuthUsersByQuery(parsed.data.query);
}

export interface StaffInviteMutationResult {
  ok: boolean;
  message: string;
}

interface StaffInviteUpsertInput {
  shopId: string;
  role: 'admin' | 'staff';
  matchedUser: StaffInviteLookupResult;
}

async function upsertStaffInvitationRecord({
  shopId,
  role,
  matchedUser,
}: StaffInviteUpsertInput): Promise<StaffInviteMutationResult> {
  const supabase = await createSupabaseServerClient();
  const [{ data: existingMembership }, { data: existingStaff }] = await Promise.all([
    supabase
      .from('shop_memberships')
      .select('id, membership_status, role')
      .eq('shop_id', shopId)
      .eq('user_id', matchedUser.userId)
      .maybeSingle(),
    supabase
      .from('staff')
      .select('id, is_active')
      .eq('shop_id', shopId)
      .eq('auth_user_id', matchedUser.userId)
      .maybeSingle(),
  ]);

  if (
    existingMembership?.membership_status === 'active' ||
    (existingStaff?.id && existingStaff.is_active)
  ) {
    return {
      ok: false,
      message: `${matchedUser.fullName} ya forma parte del equipo en esta barberia.`,
    };
  }

  if (existingMembership?.id) {
    const { error } = await supabase
      .from('shop_memberships')
      .update({
        role,
        membership_status: 'invited',
      })
      .eq('id', existingMembership.id)
      .eq('shop_id', shopId);

    if (error) {
      return {
        ok: false,
        message: `${matchedUser.fullName}: ${error.message}`,
      };
    }
  } else {
    const { error } = await supabase.from('shop_memberships').insert({
      shop_id: shopId,
      user_id: matchedUser.userId,
      role,
      membership_status: 'invited',
    });

    if (error) {
      return {
        ok: false,
        message: `${matchedUser.fullName}: ${error.message}`,
      };
    }
  }

  return {
    ok: true,
    message: `Invitacion enviada a ${matchedUser.fullName}.`,
  };
}

export async function createStaffInvitationAction(input: {
  shopId: string;
  email: string;
  userId?: string | null;
  role: 'admin' | 'staff';
}): Promise<StaffInviteMutationResult> {
  const parsed = z
    .object({
      shopId: uuidSchema,
      email: z.string().trim().email(),
      userId: uuidSchema.optional().nullable(),
      role: staffRoleSchema,
    })
    .safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.flatten().formErrors.join(', ') || 'No se pudo preparar la invitacion.',
    };
  }

  await requireAdmin({ shopId: parsed.data.shopId });

  const matchedUser = await findAuthUserByEmail(parsed.data.email);
  if (!matchedUser) {
    return {
      ok: false,
      message: 'No encontramos un usuario registrado con ese email.',
    };
  }

  if (parsed.data.userId && parsed.data.userId !== matchedUser.userId) {
    return {
      ok: false,
      message: 'El usuario seleccionado ya no coincide con el email buscado. Vuelve a seleccionarlo.',
    };
  }

  const result = await upsertStaffInvitationRecord({
    shopId: parsed.data.shopId,
    role: parsed.data.role,
    matchedUser,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath('/admin/staff');
  revalidatePath('/cuenta');

  return {
    ok: true,
    message: `Invitacion enviada a ${matchedUser.fullName}. La vera en sus notificaciones y podra aceptar desde su cuenta.`,
  };
}

export async function createStaffInvitationsAction(input: {
  shopId: string;
  role: 'admin' | 'staff';
  invitees: Array<{
    email: string;
    userId: string;
  }>;
}): Promise<StaffInviteMutationResult> {
  const parsed = z
    .object({
      shopId: uuidSchema,
      role: staffRoleSchema,
      invitees: z
        .array(
          z.object({
            email: z.string().trim().email(),
            userId: uuidSchema,
          }),
        )
        .min(1),
    })
    .safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.flatten().formErrors.join(', ') || 'No se pudieron preparar las invitaciones.',
    };
  }

  await requireAdmin({ shopId: parsed.data.shopId });

  const uniqueInvitees = parsed.data.invitees.filter(
    (invitee, index, collection) =>
      collection.findIndex((item) => item.userId === invitee.userId) === index,
  );
  const successes: string[] = [];
  const failures: string[] = [];

  for (const invitee of uniqueInvitees) {
    const matchedUser = await findAuthUserByEmail(invitee.email);
    if (!matchedUser) {
      failures.push(`${invitee.email}: usuario no encontrado.`);
      continue;
    }

    if (matchedUser.userId !== invitee.userId) {
      failures.push(`${invitee.email}: la seleccion ya no coincide con la busqueda actual.`);
      continue;
    }

    const result = await upsertStaffInvitationRecord({
      shopId: parsed.data.shopId,
      role: parsed.data.role,
      matchedUser,
    });

    if (result.ok) {
      successes.push(matchedUser.fullName);
    } else {
      failures.push(result.message);
    }
  }

  if (successes.length > 0) {
    revalidatePath('/admin/staff');
    revalidatePath('/admin/notifications');
    revalidatePath('/cuenta');
  }

  if (!successes.length) {
    return {
      ok: false,
      message: failures.join(' ') || 'No se envio ninguna invitacion.',
    };
  }

  const sentMessage =
    successes.length === 1
      ? `Invitacion enviada a ${successes[0]}.`
      : `Se enviaron ${successes.length} invitaciones.`;
  const failedMessage = failures.length ? ` ${failures.join(' ')}` : '';

  return {
    ok: true,
    message: `${sentMessage}${failedMessage}`.trim(),
  };
}

export async function respondToStaffInvitationAction(formData: FormData) {
  const ctx = await requireAuthenticated('/cuenta');
  const parsed = z
    .object({
      membership_id: uuidSchema,
      decision: z.enum(['accept', 'decline']),
    })
    .safeParse({
      membership_id: formValue(formData, 'membership_id'),
      decision: formValue(formData, 'decision'),
    });

  if (!parsed.success || !ctx.userId) {
    throw new Error('No se pudo procesar la invitacion.');
  }

  const supabase = await createSupabaseServerClient();
  const { data: membership } = await supabase
    .from('shop_memberships')
    .select('id, shop_id, role, membership_status')
    .eq('id', parsed.data.membership_id)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (!membership?.id) {
    throw new Error('La invitacion ya no esta disponible.');
  }

  if (String(membership.membership_status) !== 'invited') {
    revalidatePath('/cuenta');
    revalidatePath('/mis-barberias');
    revalidatePath('/admin/notifications');
    return;
  }

  const admin = createSupabaseAdminClient();

  if (parsed.data.decision === 'decline') {
    const { error } = await admin
      .from('shop_memberships')
      .update({ membership_status: 'disabled' })
      .eq('id', membership.id)
      .eq('user_id', ctx.userId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/cuenta');
    revalidatePath('/mis-barberias');
    revalidatePath('/admin/staff');
    revalidatePath('/admin/notifications');
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const metadata = (user?.user_metadata as Record<string, unknown> | null | undefined) || null;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, phone')
    .eq('auth_user_id', ctx.userId)
    .maybeSingle();

  const resolvedName = getUserDisplayName(ctx.email, profile, metadata);
  const resolvedPhone =
    (typeof profile?.phone === 'string' && profile.phone.trim()) || 'Pendiente';
  const staffRole = String(membership.role) === 'admin' ? 'admin' : 'staff';

  const { error: membershipError } = await admin
    .from('shop_memberships')
    .update({ membership_status: 'active' })
    .eq('id', membership.id)
    .eq('user_id', ctx.userId);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const { data: existingStaff } = await admin
    .from('staff')
    .select('id, phone')
    .eq('shop_id', String(membership.shop_id))
    .eq('auth_user_id', ctx.userId)
    .maybeSingle();

  if (existingStaff?.id) {
    const { error: updateStaffError } = await admin
      .from('staff')
      .update({
        name: resolvedName,
        phone:
          (typeof existingStaff.phone === 'string' && existingStaff.phone.trim()) ||
          resolvedPhone,
        role: staffRole,
        is_active: true,
      })
      .eq('id', existingStaff.id)
      .eq('shop_id', String(membership.shop_id));

    if (updateStaffError) {
      throw new Error(updateStaffError.message);
    }
  } else {
    const { error: insertStaffError } = await admin.from('staff').insert({
      shop_id: String(membership.shop_id),
      auth_user_id: ctx.userId,
      name: resolvedName,
      phone: resolvedPhone,
      role: staffRole,
      is_active: true,
    });

    if (insertStaffError) {
      throw new Error(insertStaffError.message);
    }
  }

  revalidatePath('/cuenta');
  revalidatePath('/mis-barberias');
  revalidatePath('/admin/staff');
  revalidatePath('/admin/notifications');
  revalidatePath('/staff');
}

function revalidateAppointmentMetrics() {
  revalidatePath('/staff');
  revalidatePath('/admin/appointments');
  revalidatePath('/admin/metrics');
  revalidatePath('/cuenta');
}

async function ensureCourseBelongsToShop(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  courseId: string,
  shopId: string,
) {
  const { data: course } = await supabase
    .from('courses')
    .select('id, shop_id')
    .eq('id', courseId)
    .maybeSingle();

  if (!course || String(course.shop_id || '') !== shopId) {
    throw new Error('El curso no pertenece a la barberia seleccionada.');
  }
}

async function ensureSessionBelongsToShop(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  sessionId: string,
  shopId: string,
) {
  const { data: session } = await supabase
    .from('course_sessions')
    .select('id, course_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session?.course_id) {
    throw new Error('La sesion no existe en la barberia seleccionada.');
  }

  await ensureCourseBelongsToShop(supabase, String(session.course_id), shopId);
}

async function ensureStaffBelongsToShop(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  staffId: string,
  shopId: string,
) {
  const { data: staffMember } = await supabase
    .from('staff')
    .select('id, shop_id')
    .eq('id', staffId)
    .eq('shop_id', shopId)
    .maybeSingle();

  if (!staffMember?.id) {
    throw new Error('El personal seleccionado no pertenece a la barberia activa.');
  }
}

export interface MarkAppointmentCompletedResult {
  reviewLink: string | null;
}

export async function markAppointmentCompletedAction(
  input: { appointmentId: string; shopId: string; priceCents?: number },
): Promise<MarkAppointmentCompletedResult> {
  const parsed = markAppointmentCompletedInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de finalizacion invalidos.');
  }

  const ctx = await getCurrentAuthContext({ shopId: parsed.data.shopId });

  if (
    (ctx.selectedWorkspaceRole !== 'admin' && ctx.selectedWorkspaceRole !== 'staff') ||
    !ctx.shopId
  ) {
    throw new Error('No tienes acceso a esta barberia.');
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
    .eq('shop_id', ctx.shopId)
    .single();

  if (accessError || !appointment) {
    throw new Error(ctx.selectedWorkspaceRole === 'admin' ? 'No se encontro la cita.' : 'No tienes acceso a esta cita.');
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
  const shopId = requireFormShopId(formData);
  await requireAdmin({ shopId });

  const parsed = staffUpsertSchema.safeParse({
    id: formValue(formData, 'id'),
    shop_id: shopId,
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
  const shopId = requireFormShopId(formData);
  await requireAdmin({ shopId });

  const parsed = serviceUpsertSchema.safeParse({
    id: formValue(formData, 'id'),
    shop_id: shopId,
    name: formValue(formData, 'name'),
    price_cents: parsePriceCentsValue(formValue(formData, 'price_cents')),
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
  const shopId = requireFormShopId(formData);
  await requireAdmin({ shopId });

  const parsed = workingHoursUpsertSchema.safeParse({
    id: formValue(formData, 'id'),
    shop_id: shopId,
    staff_id: formValue(formData, 'staff_id'),
    day_of_week: Number(formValue(formData, 'day_of_week') || -1),
    start_time: formValue(formData, 'start_time'),
    end_time: formValue(formData, 'end_time'),
  });

  if (!parsed.success) {
    throw new Error(
      getValidationErrorMessage(parsed.error, 'Datos de horario invalidos.', {
        staff_id: 'Personal',
        day_of_week: 'Dia',
        start_time: 'Desde',
        end_time: 'Hasta',
      }),
    );
  }

  const supabase = await createSupabaseServerClient();
  await ensureStaffBelongsToShop(supabase, parsed.data.staff_id, parsed.data.shop_id);
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

export async function upsertWorkingHoursRangeAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  await requireAdmin({ shopId });

  const parsed = workingHoursRangeUpsertSchema.safeParse({
    shop_id: shopId,
    staff_id: formValue(formData, 'staff_id'),
    day_from: Number(formValue(formData, 'day_from') || -1),
    day_to: Number(formValue(formData, 'day_to') || -1),
    start_time: formValue(formData, 'start_time'),
    end_time: formValue(formData, 'end_time'),
    replace_existing: formData.get('replace_existing') === 'on',
  });

  if (!parsed.success) {
    throw new Error(
      getValidationErrorMessage(parsed.error, 'Datos de horario invalidos.', {
        staff_id: 'Personal',
        day_from: 'Dia inicial',
        day_to: 'Dia final',
        start_time: 'Desde',
        end_time: 'Hasta',
      }),
    );
  }

  const supabase = await createSupabaseServerClient();
  await ensureStaffBelongsToShop(supabase, parsed.data.staff_id, parsed.data.shop_id);

  const dayRange = resolveWeekdayRange(parsed.data.day_from, parsed.data.day_to);
  if (!dayRange.length) {
    throw new Error('Selecciona un rango de dias valido.');
  }

  if (parsed.data.replace_existing) {
    const { error: deleteError } = await supabase
      .from('working_hours')
      .delete()
      .eq('shop_id', parsed.data.shop_id)
      .eq('staff_id', parsed.data.staff_id)
      .in('day_of_week', dayRange);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  const rows = dayRange.map((dayOfWeek) => ({
    shop_id: parsed.data.shop_id,
    staff_id: parsed.data.staff_id,
    day_of_week: dayOfWeek,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time,
  }));

  const mutation = parsed.data.replace_existing
    ? await supabase.from('working_hours').insert(rows)
    : await supabase
        .from('working_hours')
        .upsert(rows, { onConflict: 'staff_id,day_of_week,start_time,end_time', ignoreDuplicates: true });

  if (mutation.error) {
    throw new Error(mutation.error.message);
  }

  revalidatePath('/admin/staff');
}

export async function createTimeOffAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  await requireAdmin({ shopId });

  const parsed = timeOffUpsertSchema.safeParse({
    shop_id: shopId,
    staff_id: formValue(formData, 'staff_id'),
    start_at: formDateTimeIso(formData, 'start_at'),
    end_at: formDateTimeIso(formData, 'end_at'),
    reason: formValue(formData, 'reason') || null,
  });

  if (!parsed.success) {
    throw new Error(
      getValidationErrorMessage(parsed.error, 'Datos de bloqueo invalidos.', {
        staff_id: 'Personal',
        start_at: 'Inicio',
        end_at: 'Fin',
        reason: 'Motivo',
      }),
    );
  }

  const supabase = await createSupabaseServerClient();
  await ensureStaffBelongsToShop(supabase, parsed.data.staff_id, parsed.data.shop_id);
  await supabase.from('time_off').insert(parsed.data);

  revalidatePath('/admin/staff');
}

export async function createStaffTimeOffRequestAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  const ctx = await requireStaff({ shopId });

  const parsed = z
    .object({
      shop_id: uuidSchema,
      start_at: z.string().min(1),
      end_at: z.string().min(1),
      reason: z.string().optional().nullable(),
    })
    .safeParse({
      shop_id: shopId,
      start_at: formDateTimeIso(formData, 'start_at'),
      end_at: formDateTimeIso(formData, 'end_at'),
      reason: formValue(formData, 'reason') || null,
    });

  if (!parsed.success) {
    throw new Error(
      getValidationErrorMessage(parsed.error, 'Datos de ausencia invalidos.', {
        start_at: 'Inicio',
        end_at: 'Fin',
        reason: 'Motivo',
      }),
    );
  }

  const payload = timeOffUpsertSchema.safeParse({
    shop_id: parsed.data.shop_id,
    staff_id: ctx.staffId,
    start_at: parsed.data.start_at,
    end_at: parsed.data.end_at,
    reason: markPendingTimeOffReason(parsed.data.reason),
  });

  if (!payload.success) {
    throw new Error(
      getValidationErrorMessage(payload.error, 'No se pudo registrar la solicitud.', {
        staff_id: 'Personal',
        start_at: 'Inicio',
        end_at: 'Fin',
        reason: 'Motivo',
      }),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('time_off').insert(payload.data);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/staff');
  revalidatePath('/admin');
  revalidatePath('/admin/staff');
  revalidatePath('/admin/notifications');
}

export async function reviewStaffTimeOffRequestAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  await requireAdmin({ shopId });

  const parsed = z
    .object({
      shop_id: uuidSchema,
      time_off_id: uuidSchema,
      decision: z.enum(['approve', 'reject']),
    })
    .safeParse({
      shop_id: shopId,
      time_off_id: formValue(formData, 'time_off_id'),
      decision: formValue(formData, 'decision'),
    });

  if (!parsed.success) {
    throw new Error('No se pudo revisar la solicitud de ausencia.');
  }

  await reviewPendingTimeOffRequest({
    shopId: parsed.data.shop_id,
    timeOffId: parsed.data.time_off_id,
    decision: parsed.data.decision,
  });

  revalidatePath('/admin');
  revalidatePath('/admin/notifications');
  revalidatePath('/admin/staff');
  revalidatePath('/staff');
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  const ctx = await requireAdmin({ shopId });

  const parsed = updateAppointmentStatusSchema.safeParse({
    appointment_id: formValue(formData, 'appointment_id'),
    status: formValue(formData, 'status'),
    price_cents: formValue(formData, 'price_cents')
      ? parsePriceCentsValue(formValue(formData, 'price_cents'))
      : undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de actualizacion de cita invalidos.');
  }

  const result = await updateAppointmentStatusForActor({
    appointmentId: parsed.data.appointment_id,
    status: parsed.data.status,
    actorRole: 'admin',
    actorUserId: ctx.userId,
    actorStaffId: ctx.staffId || '',
    priceCents: parsed.data.price_cents ?? null,
  });

  revalidateAppointmentMetrics();

  return parsed.data.status === 'done'
    ? {
        reviewLink: result.reviewLink,
      }
    : null;
}

export async function createManualAppointmentAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  const ctx = await getCurrentAuthContext({ shopId });

  if (
    (ctx.selectedWorkspaceRole !== 'admin' && ctx.selectedWorkspaceRole !== 'staff') ||
    !ctx.shopId
  ) {
    throw new Error('No tienes permisos para crear reservas manuales.');
  }

  const sourceChannelParsed = manualAppointmentSourceSchema.safeParse(
    formValue(formData, 'source_channel'),
  );

  if (!sourceChannelParsed.success) {
    throw new Error('Selecciona un canal valido para registrar la reserva.');
  }

  const bookingParsed = bookingInputSchema.safeParse({
    shop_id: shopId,
    service_id: formValue(formData, 'service_id'),
    staff_id: formValue(formData, 'staff_id'),
    start_at: formDateTimeIso(formData, 'start_at'),
    customer_name: formValue(formData, 'customer_name'),
    customer_phone: formValue(formData, 'customer_phone'),
    customer_email: formValue(formData, 'customer_email') || null,
    notes: formValue(formData, 'notes') || null,
  });

  if (!bookingParsed.success) {
    throw new Error(bookingParsed.error.flatten().formErrors.join(', ') || 'Datos de cita invalidos.');
  }

  if (!bookingParsed.data.staff_id) {
    throw new Error('Selecciona un barbero valido para registrar la cita.');
  }

  await createAppointmentFromBookingIntent(
    {
      shop_id: bookingParsed.data.shop_id,
      service_id: bookingParsed.data.service_id,
      staff_id: bookingParsed.data.staff_id,
      start_at: bookingParsed.data.start_at,
      customer_name: bookingParsed.data.customer_name,
      customer_phone: bookingParsed.data.customer_phone,
      customer_email: bookingParsed.data.customer_email || null,
      notes: bookingParsed.data.notes || null,
    },
    {
      sourceChannel: sourceChannelParsed.data,
    },
  );

  revalidateAppointmentMetrics();
}

export async function upsertCourseAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  const shopSlug = requireFormShopSlug(formData);
  await requireAdmin({ shopId });
  const requiresModel = formData.get('requires_model') === 'on';
  const modelCategories = formStringArray(formData, 'model_categories');
  const rawImageFile = formData.get('image_file');
  const imageFile = rawImageFile instanceof File && rawImageFile.size > 0 ? rawImageFile : null;

  if (imageFile) {
    if (!ALLOWED_COURSE_IMAGE_TYPES.has(imageFile.type)) {
      throw new Error('La imagen del curso debe ser JPG, PNG o WEBP.');
    }

    if (imageFile.size > MAX_COURSE_IMAGE_SIZE) {
      throw new Error('La imagen del curso debe pesar menos de 8MB.');
    }
  }

  const parsed = courseUpsertSchema.safeParse({
    id: formValue(formData, 'id'),
    shop_id: shopId,
    title: formValue(formData, 'title'),
    description: formValue(formData, 'description'),
    price_cents: parsePriceCentsValue(formValue(formData, 'price_cents')),
    duration_hours: parseIntegerValue(formValue(formData, 'duration_hours')),
    level: formValue(formData, 'level'),
    requires_model: requiresModel,
    model_categories: requiresModel ? modelCategories : [],
    is_active: formData.get('is_active') === 'on',
    image_url: formValue(formData, 'image_url') || null,
  });

  if (!parsed.success) {
    throw new Error(
      getValidationErrorMessage(parsed.error, 'Datos de curso invalidos.', {
        title: 'Titulo',
        description: 'Descripcion',
        price_cents: 'Precio',
        duration_hours: 'Horas',
        level: 'Nivel',
        model_categories: 'Categorias de modelo',
        image_url: 'Imagen',
      }),
    );
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  let uploadedStoragePath: string | null = null;
  let previousImageStoragePath: string | null = null;
  let nextImageUrl = parsed.data.image_url || null;

  try {
    if (parsed.data.id) {
      const { data: existingCourse, error: existingCourseError } = await supabase
        .from('courses')
        .select('id, image_url')
        .eq('id', parsed.data.id)
        .eq('shop_id', parsed.data.shop_id)
        .maybeSingle();

      if (existingCourseError) {
        throw new Error(existingCourseError.message);
      }

      if (!existingCourse?.id) {
        throw new Error('No encontramos el curso que intentas editar en esta barberia.');
      }

      previousImageStoragePath = parsePublicAssetsStoragePath(String(existingCourse.image_url || ''));
    }

    if (imageFile) {
      await ensurePublicAssetsBucket(admin);

      const fileExtension = getImageFileExtension(imageFile);
      const safeName = sanitizeStorageFilename(imageFile.name || `course-image.${fileExtension}`);
      const storagePath = `shops/${shopId}/courses/${parsed.data.id || randomUUID()}/${Date.now()}-${randomUUID()}-${safeName}`;
      const buffer = Buffer.from(await imageFile.arrayBuffer());

      const { error: uploadError } = await admin.storage.from(PUBLIC_ASSETS_BUCKET).upload(storagePath, buffer, {
        contentType: imageFile.type || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      uploadedStoragePath = storagePath;
      const {
        data: { publicUrl },
      } = admin.storage.from(PUBLIC_ASSETS_BUCKET).getPublicUrl(storagePath);

      nextImageUrl = publicUrl;
    }

    const payload = {
      ...parsed.data,
      image_url: nextImageUrl,
    };

    if (payload.id) {
      const { id, ...updatePayload } = payload;
      const { error } = await supabase
        .from('courses')
        .update(updatePayload)
        .eq('id', id)
        .eq('shop_id', payload.shop_id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from('courses').insert(payload);
      if (error) {
        throw new Error(error.message);
      }
    }

    if (
      uploadedStoragePath &&
      previousImageStoragePath &&
      previousImageStoragePath !== uploadedStoragePath
    ) {
      await admin.storage.from(PUBLIC_ASSETS_BUCKET).remove([previousImageStoragePath]);
    }
  } catch (error) {
    if (uploadedStoragePath) {
      await admin.storage.from(PUBLIC_ASSETS_BUCKET).remove([uploadedStoragePath]);
    }

    throw error;
  }

  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  revalidatePath('/modelos');
  revalidatePath('/modelos/registro');
  if (shopSlug) {
    revalidatePath(`/shops/${shopSlug}/courses`);
    if (parsed.data.id) {
      revalidatePath(`/shops/${shopSlug}/courses/${parsed.data.id}`);
    }
    revalidatePath(`/shops/${shopSlug}/modelos`);
    revalidatePath(`/shops/${shopSlug}/modelos/registro`);
  }
}

export async function upsertCourseSessionAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  const shopSlug = requireFormShopSlug(formData);
  await requireAdmin({ shopId });

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
  await ensureCourseBelongsToShop(supabase, parsed.data.course_id, shopId);
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, requires_model, model_categories')
    .eq('id', parsed.data.course_id)
    .eq('shop_id', shopId)
    .maybeSingle();

  if (courseError) {
    throw new Error(courseError.message);
  }

  if (!course?.id) {
    throw new Error('No se encontro el curso seleccionado para esta barberia.');
  }

  let sessionId = parsed.data.id ? String(parsed.data.id) : '';
  if (parsed.data.id) {
    await ensureSessionBelongsToShop(supabase, parsed.data.id, shopId);
    const { error: sessionUpdateError } = await supabase
      .from('course_sessions')
      .update(parsed.data)
      .eq('id', parsed.data.id);

    if (sessionUpdateError) {
      throw new Error(sessionUpdateError.message);
    }
  } else {
    const { data: insertedSession, error: sessionInsertError } = await supabase
      .from('course_sessions')
      .insert(parsed.data)
      .select('id')
      .single();

    if (sessionInsertError || !insertedSession?.id) {
      throw new Error(sessionInsertError?.message || 'No se pudo crear la sesion.');
    }

    sessionId = String(insertedSession.id);
  }

  if (Boolean(course.requires_model) && sessionId) {
    const { data: existingRequirement, error: requirementLookupError } = await supabase
      .from('model_requirements')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (requirementLookupError) {
      throw new Error(requirementLookupError.message);
    }

    if (!existingRequirement?.id) {
      const modelCategories = unknownStringArray(course.model_categories);
      const defaultModelsNeeded = Math.max(1, Math.min(3, Number(parsed.data.capacity) || 1));
      const notesSuffix = modelCategories.length
        ? `Categorias: ${modelCategories.join(', ')}.`
        : '';

      const { error: requirementInsertError } = await supabase
        .from('model_requirements')
        .insert({
          session_id: sessionId,
          requirements: {
            models_needed: defaultModelsNeeded,
            beard_required: false,
            hair_length_category: 'indistinto',
            hair_type: null,
            categories: modelCategories,
          },
          compensation_type: 'gratis',
          compensation_value_cents: null,
          notes_public: `Convocatoria para practica de ${String(course.title)}. ${notesSuffix}`.trim(),
          is_open: true,
        });

      if (requirementInsertError) {
        throw new Error(requirementInsertError.message);
      }
    }
  }

  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  revalidatePath('/modelos');
  revalidatePath('/modelos/registro');

  if (shopSlug) {
    revalidatePath(`/shops/${shopSlug}/modelos`);
    revalidatePath(`/shops/${shopSlug}/modelos/registro`);
  }
}

export async function updateJobApplicationAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  const ctx = await requireAdmin({ shopId });

  const parsed = jobApplicationUpdateSchema.safeParse({
    application_id: formValue(formData, 'application_id'),
    status: formValue(formData, 'status'),
    notes: formValue(formData, 'notes') || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(', ') || 'Datos de postulacion invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  const { data: application } = await supabase
    .from('job_applications')
    .select('id, shop_id')
    .eq('id', parsed.data.application_id)
    .maybeSingle();

  if (!application || String(application.shop_id || '') !== ctx.shopId) {
    throw new Error('La postulacion no pertenece a la barberia seleccionada.');
  }

  await supabase
    .from('job_applications')
    .update({ status: parsed.data.status, notes: parsed.data.notes || null })
    .eq('id', parsed.data.application_id);

  revalidatePath('/admin/applicants');
}

export async function upsertModelRequirementsAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  const shopSlug = requireFormShopSlug(formData);
  const ctx = await requireAdmin({ shopId });

  const parsed = modelRequirementsInputSchema.safeParse({
    session_id: formValue(formData, 'session_id'),
    models_needed: Number(formValue(formData, 'models_needed') || 0),
    beard_required: formData.get('beard_required') === 'on',
    hair_length_category: formValue(formData, 'hair_length_category') || 'indistinto',
    hair_type: formValue(formData, 'hair_type') || null,
    compensation_type: formValue(formData, 'compensation_type'),
    compensation_value_cents: formValue(formData, 'compensation_value_cents')
      ? parsePriceCentsValue(formValue(formData, 'compensation_value_cents'))
      : undefined,
    notes_public: formValue(formData, 'notes_public') || null,
    is_open: formData.get('is_open') === 'on',
  });

  const fallbackSessionId = formValue(formData, 'session_id') || '';
  const sessionId = parsed.success ? parsed.data.session_id : fallbackSessionId;
  const redirectBase = buildAdminHref(
    `/admin/courses/sessions/${sessionId}/modelos`,
    shopSlug || ctx.shopSlug,
  );

  if (!parsed.success) {
    redirect(`${redirectBase}?error=${encodeURIComponent('No se pudieron guardar los requisitos de modelos.')}`);
  }

  const supabase = await createSupabaseServerClient();
  await ensureSessionBelongsToShop(supabase, parsed.data.session_id, shopId);

  const { data: existingRequirement } = await supabase
    .from('model_requirements')
    .select('requirements')
    .eq('session_id', parsed.data.session_id)
    .maybeSingle();

  const existingRequirements = (existingRequirement?.requirements as Record<string, unknown> | null) || {};
  let categories = unknownStringArray(existingRequirements.categories);

  if (!categories.length) {
    const { data: sessionWithCourse } = await supabase
      .from('course_sessions')
      .select('id, courses(model_categories)')
      .eq('id', parsed.data.session_id)
      .maybeSingle();

    const course = (sessionWithCourse?.courses as { model_categories?: unknown } | null) || null;
    categories = unknownStringArray(course?.model_categories);
  }

  const requirements = {
    ...existingRequirements,
    models_needed: parsed.data.models_needed,
    beard_required: parsed.data.beard_required || false,
    hair_length_category: parsed.data.hair_length_category || 'indistinto',
    hair_type: parsed.data.hair_type || null,
    categories,
  };

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
  const shopId = requireFormShopId(formData);
  const shopSlug = requireFormShopSlug(formData);
  const ctx = await requireAdmin({ shopId });

  const parsed = modelApplicationStatusUpdateSchema.safeParse({
    application_id: formValue(formData, 'application_id'),
    status: formValue(formData, 'status'),
    notes_internal: formValue(formData, 'notes_internal') || null,
  });

  if (!parsed.success) {
    redirect(
      buildAdminHref('/admin/modelos', shopSlug || ctx.shopSlug, {
        error: 'No se pudo actualizar el estado.',
      }),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: application, error: applicationError } = await supabase
    .from('model_applications')
    .select('id, session_id, status')
    .eq('id', parsed.data.application_id)
    .single();

  if (applicationError || !application) {
    redirect(
      buildAdminHref('/admin/modelos', shopSlug || ctx.shopSlug, {
        error: 'No se encontro la postulacion.',
      }),
    );
  }

  const sessionId = String(application.session_id);
  await ensureSessionBelongsToShop(supabase, sessionId, shopId);
  const redirectBase = buildAdminHref(
    `/admin/courses/sessions/${sessionId}/modelos`,
    shopSlug || ctx.shopSlug,
  );

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
  const shopId = requireFormShopId(formData);
  const shopSlug = requireFormShopSlug(formData);
  const ctx = await requireAdmin({ shopId });

  const modelId = formValue(formData, 'model_id');
  if (!modelId) {
    redirect(
      buildAdminHref('/admin/modelos', shopSlug || ctx.shopSlug, {
        error: 'Modelo invalido.',
      }),
    );
  }

  const notes = formValue(formData, 'notes_internal') || null;
  const supabase = await createSupabaseServerClient();
  const { data: model } = await supabase
    .from('models')
    .select('id, shop_id')
    .eq('id', modelId)
    .maybeSingle();

  if (!model || String(model.shop_id || '') !== shopId) {
    redirect(
      buildAdminHref('/admin/modelos', shopSlug || ctx.shopSlug, {
        error: 'Modelo fuera de la barberia seleccionada.',
      }),
    );
  }

  const { error } = await supabase
    .from('models')
    .update({ notes_internal: notes })
    .eq('id', modelId)
    .eq('shop_id', shopId);

  if (error) {
    redirect(
      buildAdminHref('/admin/modelos', shopSlug || ctx.shopSlug, {
        error: 'No se pudieron guardar las notas.',
      }),
    );
  }

  revalidatePath('/admin/modelos');
  redirect(
    buildAdminHref('/admin/modelos', shopSlug || ctx.shopSlug, {
      model_id: modelId,
      ok: 'Notas internas actualizadas.',
    }),
  );
}

export async function updateOwnAppointmentStatusAction(formData: FormData) {
  const shopId = requireFormShopId(formData);
  const ctx = await requireStaff({ shopId });

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

  await updateAppointmentStatusForActor({
    appointmentId: parsed.data.appointment_id,
    status: parsed.data.status,
    actorRole: 'staff',
    actorUserId: ctx.userId,
    actorStaffId: ctx.staffId,
  });

  revalidateAppointmentMetrics();
}

