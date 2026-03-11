import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPendingTimeOffReason, stripPendingTimeOffReason } from '@/lib/time-off-requests';

const ADMIN_NOTIFICATION_NEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const STALE_PENDING_INTENTS_MINUTES = 30;
const ADMIN_NOTIFICATION_PREVIEW_QUERY_LIMIT = 12;

interface MembershipRow {
  id: string | null;
  user_id: string | null;
  role: string | null;
  created_at: string | null;
}

interface MembershipProfileRow {
  auth_user_id: string | null;
  full_name: string | null;
}

interface TimeOffRow {
  id: string | null;
  start_at: string | null;
  end_at: string | null;
  reason: string | null;
  created_at: string | null;
  staff: { name?: string | null } | null;
}

interface StalePaymentIntentRow {
  id: string | null;
  created_at: string | null;
  intent_type: string | null;
  payload: Record<string, unknown> | null;
}

export interface AdminPendingMembershipNotification {
  id: string;
  profileName: string;
  role: 'admin' | 'staff';
  createdAt: string;
}

export interface AdminPendingTimeOffNotification {
  id: string;
  staffName: string;
  startAt: string;
  endAt: string;
  reason: string;
  createdAt: string;
}

export interface AdminPendingPaymentNotification {
  id: string;
  intentType: 'booking' | 'subscription' | 'course_enrollment';
  createdAt: string;
  customerName: string | null;
}

export type AdminNotificationDigestItemKind = 'time_off' | 'membership' | 'payment';

export interface AdminNotificationDigestItem {
  id: string;
  kind: AdminNotificationDigestItemKind;
  targetId: string;
  title: string;
  detail: string;
  createdAt: string | null;
  isNew: boolean;
}

export interface AdminNotificationsData {
  stalePendingIntents: number;
  pendingMembershipNotifications: AdminPendingMembershipNotification[];
  pendingTimeOffRequests: AdminPendingTimeOffNotification[];
  pendingPaymentNotifications: AdminPendingPaymentNotification[];
  pendingMembershipCount: number;
  pendingTimeOffCount: number;
  totalCount: number;
}

function normalizeRole(value: string | null | undefined): 'admin' | 'staff' {
  return value === 'admin' ? 'admin' : 'staff';
}

function normalizePaymentIntentType(
  value: string | null | undefined,
): 'booking' | 'subscription' | 'course_enrollment' {
  if (value === 'subscription' || value === 'course_enrollment') {
    return value;
  }

  return 'booking';
}

function extractPaymentCustomerName(payload: Record<string, unknown> | null) {
  if (!payload) {
    return null;
  }

  const directName = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (directName) {
    return directName;
  }

  const customerName =
    typeof payload.customer_name === 'string' ? payload.customer_name.trim() : '';
  if (customerName) {
    return customerName;
  }

  const fullName = typeof payload.full_name === 'string' ? payload.full_name.trim() : '';
  return fullName || null;
}

function isNewNotification(createdAt: string | null | undefined) {
  if (!createdAt) {
    return false;
  }

  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return Date.now() - parsed.getTime() <= ADMIN_NOTIFICATION_NEW_WINDOW_MS;
}

function sortNotificationDigestItems(
  left: AdminNotificationDigestItem,
  right: AdminNotificationDigestItem,
) {
  const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : Number.NEGATIVE_INFINITY;
  const rightTime = right.createdAt
    ? new Date(right.createdAt).getTime()
    : Number.NEGATIVE_INFINITY;

  if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) {
    return left.title.localeCompare(right.title, 'es');
  }

  if (!Number.isFinite(leftTime)) {
    return 1;
  }

  if (!Number.isFinite(rightTime)) {
    return -1;
  }

  return rightTime - leftTime;
}

function normalizeNotificationTargetSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'item';
}

export function buildAdminNotificationTargetId(
  kind: AdminNotificationDigestItemKind,
  resourceId: string,
) {
  return `admin-notification-${kind}-${normalizeNotificationTargetSegment(resourceId)}`;
}

export function buildAdminNotificationDigest(
  data: AdminNotificationsData,
  options?: { limit?: number },
): AdminNotificationDigestItem[] {
  const limit = Math.max(1, Math.min(Number(options?.limit || 10), 20));

  const items: AdminNotificationDigestItem[] = [
    ...data.pendingTimeOffRequests.map((item) => ({
      id: `time_off:${item.id}`,
      kind: 'time_off' as const,
      targetId: buildAdminNotificationTargetId('time_off', item.id),
      title: 'Solicitud de ausencia',
      detail: `${item.staffName} - ${item.reason}`,
      createdAt: item.createdAt,
      isNew: isNewNotification(item.createdAt),
    })),
    ...data.pendingMembershipNotifications.map((item) => ({
      id: `membership:${item.id}`,
      kind: 'membership' as const,
      targetId: buildAdminNotificationTargetId('membership', item.id),
      title: 'Invitacion pendiente',
      detail: `${item.profileName} - ${item.role === 'admin' ? 'Administrador' : 'Staff'}`,
      createdAt: item.createdAt,
      isNew: isNewNotification(item.createdAt),
    })),
    ...data.pendingPaymentNotifications.map((item) => ({
      id: `payment:${item.id}`,
      kind: 'payment' as const,
      targetId: buildAdminNotificationTargetId('payment', item.id),
      title:
        item.intentType === 'subscription'
          ? 'Cobro de suscripcion pendiente'
          : item.intentType === 'course_enrollment'
            ? 'Pago de curso pendiente'
            : 'Pago de reserva pendiente',
      detail:
        item.customerName ||
        (item.intentType === 'subscription'
          ? 'Una suscripcion quedo sin confirmar.'
          : item.intentType === 'course_enrollment'
            ? 'Una inscripcion quedo con pago pendiente.'
            : 'Una reserva quedo con pago pendiente.'),
      createdAt: item.createdAt,
      isNew: isNewNotification(item.createdAt),
    })),
  ];

  return items.sort(sortNotificationDigestItems).slice(0, limit);
}

export async function getAdminNotificationsData(shopId: string): Promise<AdminNotificationsData> {
  const supabase = await createSupabaseServerClient();
  const stalePendingSince = new Date(
    Date.now() - STALE_PENDING_INTENTS_MINUTES * 60 * 1000,
  ).toISOString();

  const [
    membershipsResult,
    timeOffResult,
    stalePendingIntentsCountResult,
    stalePendingIntentsPreviewResult,
  ] = await Promise.all([
    supabase
      .from('shop_memberships')
      .select('id, user_id, role, created_at')
      .eq('shop_id', shopId)
      .in('role', ['admin', 'staff'])
      .eq('membership_status', 'invited')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('time_off')
      .select('id, start_at, end_at, reason, created_at, staff(name)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('payment_intents')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .in('status', ['pending', 'processing'])
      .lte('created_at', stalePendingSince),
    supabase
      .from('payment_intents')
      .select('id, created_at, intent_type, payload')
      .eq('shop_id', shopId)
      .in('status', ['pending', 'processing'])
      .lte('created_at', stalePendingSince)
      .order('created_at', { ascending: false })
      .limit(ADMIN_NOTIFICATION_PREVIEW_QUERY_LIMIT),
  ]);

  const memberships = (membershipsResult.data || []) as MembershipRow[];
  const timeOffRows = (timeOffResult.data || []) as TimeOffRow[];
  const stalePendingIntentsPreview = (stalePendingIntentsPreviewResult.data ||
    []) as StalePaymentIntentRow[];
  const membershipUserIds = Array.from(
    new Set(memberships.map((item) => String(item.user_id || '')).filter(Boolean)),
  );

  const membershipProfilesResult = membershipUserIds.length
    ? await supabase
        .from('user_profiles')
        .select('auth_user_id, full_name')
        .in('auth_user_id', membershipUserIds)
    : {
        data: [] as MembershipProfileRow[],
        error: null,
      };

  const membershipProfiles = (membershipProfilesResult.data || []) as MembershipProfileRow[];
  const profileNamesById = new Map(
    membershipProfiles.map((item) => [
      String(item.auth_user_id || ''),
      (typeof item.full_name === 'string' && item.full_name.trim()) || null,
    ]),
  );

  const pendingMembershipNotifications = memberships.map((item) => ({
    id: String(item.id),
    profileName:
      profileNamesById.get(String(item.user_id || '')) ||
      `Usuario ${String(item.user_id || '').slice(0, 8)}`,
    role: normalizeRole(item.role),
    createdAt: String(item.created_at || ''),
  }));

  const pendingTimeOffRequests = timeOffRows
    .filter((item) => isPendingTimeOffReason(item.reason))
    .map((item) => ({
      id: String(item.id),
      staffName: String((item.staff as { name?: string } | null)?.name || 'Personal'),
      startAt: String(item.start_at || ''),
      endAt: String(item.end_at || ''),
      reason: stripPendingTimeOffReason(item.reason) || 'Sin motivo',
      createdAt: String(item.created_at || ''),
    }));

  const pendingMembershipCount = pendingMembershipNotifications.length;
  const pendingTimeOffCount = pendingTimeOffRequests.length;
  const pendingPaymentNotifications = stalePendingIntentsPreview.map((item) => ({
    id: String(item.id || ''),
    intentType: normalizePaymentIntentType(item.intent_type),
    createdAt: String(item.created_at || ''),
    customerName: extractPaymentCustomerName(item.payload),
  }));
  const stalePendingIntents = Math.max(0, Number(stalePendingIntentsCountResult.count || 0));

  return {
    stalePendingIntents,
    pendingMembershipNotifications,
    pendingTimeOffRequests,
    pendingPaymentNotifications,
    pendingMembershipCount,
    pendingTimeOffCount,
    totalCount: pendingMembershipCount + pendingTimeOffCount + stalePendingIntents,
  };
}
