import { AdminNotificationsWorkspace } from '@/components/admin/admin-notifications-workspace';
import { requireAdmin } from '@/lib/auth';
import { getAdminNotificationsData } from '@/lib/admin-notifications';

interface AdminNotificationsPageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function AdminNotificationsPage({
  searchParams,
}: AdminNotificationsPageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const notifications = await getAdminNotificationsData(ctx.shopId);

  return (
    <AdminNotificationsWorkspace
      shopId={ctx.shopId}
      shopName={ctx.shopName}
      shopSlug={ctx.shopSlug}
      shopTimezone={ctx.shopTimezone}
      pendingMembershipNotifications={notifications.pendingMembershipNotifications}
      pendingTimeOffRequests={notifications.pendingTimeOffRequests}
      pendingMembershipCount={notifications.pendingMembershipCount}
      pendingTimeOffCount={notifications.pendingTimeOffCount}
      stalePendingIntents={notifications.stalePendingIntents}
      totalCount={notifications.totalCount}
    />
  );
}
