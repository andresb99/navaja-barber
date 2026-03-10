import 'server-only';

import { getProductFunnelSnapshot } from '@/lib/product-analytics';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPendingTimeOffReason, stripPendingTimeOffReason } from '@/lib/time-off-requests';

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

export interface AdminNotificationsData {
  stalePendingIntents: number;
  pendingMembershipNotifications: AdminPendingMembershipNotification[];
  pendingTimeOffRequests: AdminPendingTimeOffNotification[];
  pendingMembershipCount: number;
  pendingTimeOffCount: number;
  totalCount: number;
}

function normalizeRole(value: string | null | undefined): 'admin' | 'staff' {
  return value === 'admin' ? 'admin' : 'staff';
}

export async function getAdminNotificationsData(shopId: string): Promise<AdminNotificationsData> {
  const supabase = await createSupabaseServerClient();
  const [membershipsResult, timeOffResult, funnel] = await Promise.all([
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
    getProductFunnelSnapshot({ shopId, sinceDays: 30, stalePendingMinutes: 30 }),
  ]);

  const memberships = (membershipsResult.data || []) as MembershipRow[];
  const timeOffRows = (timeOffResult.data || []) as TimeOffRow[];
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
  const stalePendingIntents = funnel.stalePendingIntents;

  return {
    stalePendingIntents,
    pendingMembershipNotifications,
    pendingTimeOffRequests,
    pendingMembershipCount,
    pendingTimeOffCount,
    totalCount: pendingMembershipCount + pendingTimeOffCount + stalePendingIntents,
  };
}
