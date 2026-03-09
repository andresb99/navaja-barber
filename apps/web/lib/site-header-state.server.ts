import 'server-only';

import { cache } from 'react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPendingTimeOffReason } from '@/lib/time-off-requests';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import {
  DEFAULT_SITE_HEADER_STATE,
  type SiteHeaderInitialState,
} from '@/lib/site-header-state';
import { getAccessibleWorkspacesForCurrentUser } from '@/lib/workspaces';

function isMissingAccountNotificationsTableError(error: unknown) {
  if (!error) {
    return false;
  }

  const maybeError = error as { code?: string; message?: string };
  const code = String(maybeError.code || '').toUpperCase();
  const message = String(maybeError.message || error || '').toLowerCase();

  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    (message.includes('account_notifications') &&
      (message.includes('does not exist') ||
        message.includes('schema cache') ||
        message.includes('not found')))
  );
}

function resolveRoleFromWorkspaces(workspaces: Array<{ accessRole: string }>) {
  const hasAdminRole = workspaces.some(
    (workspace) =>
      workspace.accessRole === 'owner' || workspace.accessRole === 'admin',
  );
  if (hasAdminRole) {
    return 'admin' as const;
  }

  const hasStaffRole = workspaces.some((workspace) => workspace.accessRole === 'staff');
  if (hasStaffRole) {
    return 'staff' as const;
  }

  return 'user' as const;
}

export const getSiteHeaderInitialState = cache(async (): Promise<SiteHeaderInitialState> => {
  const publicTenantContext = await getPublicTenantRouteContext();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ...DEFAULT_SITE_HEADER_STATE,
      publicTenantSlug: publicTenantContext.shopSlug,
      publicTenantMode: publicTenantContext.mode,
    };
  }

  const catalog = await getAccessibleWorkspacesForCurrentUser();
  const workspaces = catalog?.workspaces || [];
  const accessibleShopIds = workspaces.map((workspace) => workspace.shopId);
  const role = resolveRoleFromWorkspaces(workspaces);
  const admin = createSupabaseAdminClient();

  const [
    { data: pendingInviteRows },
    unreadAccountNotificationsResult,
    { data: profileRow },
    { data: platformAdminRow },
  ] = await Promise.all([
    admin
      .from('shop_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('membership_status', 'invited'),
    admin
      .from('account_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
    admin
      .from('user_profiles')
      .select('full_name, avatar_url')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
    admin
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const unreadAccountNotificationsError = unreadAccountNotificationsResult.error;
  const unreadAccountNotificationsCount = unreadAccountNotificationsResult.count;
  const safeUnreadAccountNotificationsCount =
    unreadAccountNotificationsError &&
    !isMissingAccountNotificationsTableError(unreadAccountNotificationsError)
      ? 0
      : (unreadAccountNotificationsCount || 0);

  let pendingNotificationCount =
    (pendingInviteRows || []).length + safeUnreadAccountNotificationsCount;

  if (role === 'admin' && accessibleShopIds.length > 0) {
    const { data: timeOffRows } = await admin
      .from('time_off')
      .select('id, reason')
      .in('shop_id', accessibleShopIds)
      .order('created_at', { ascending: false })
      .limit(40);

    const pendingAbsenceApprovals = (timeOffRows || []).filter((item) =>
      isPendingTimeOffReason(item.reason as string | null),
    ).length;

    pendingNotificationCount =
      (pendingInviteRows || []).length +
      pendingAbsenceApprovals +
      safeUnreadAccountNotificationsCount;
  }

  const metadata = (user.user_metadata as Record<string, unknown> | undefined) ?? undefined;
  const metadataName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    null;
  const metadataAvatarUrl =
    (typeof metadata?.avatar_url === 'string' && metadata.avatar_url.trim()) ||
    (typeof metadata?.picture === 'string' && metadata.picture.trim()) ||
    null;

  const workspaceDirectory = workspaces.map((workspace) => ({
    id: workspace.shopId,
    slug: workspace.shopSlug,
    name: workspace.shopName,
  }));

  return {
    role,
    profileName: (profileRow?.full_name as string | null) || metadataName || null,
    profileAvatarUrl:
      (profileRow?.avatar_url as string | null) || metadataAvatarUrl || null,
    userEmail: user.email ?? null,
    pendingNotificationCount,
    hasWorkspaceAccess: workspaceDirectory.length > 0,
    workspaceDirectory,
    isPlatformAdmin: Boolean(platformAdminRow?.user_id),
    publicTenantSlug: publicTenantContext.shopSlug,
    publicTenantMode: publicTenantContext.mode,
  };
});
