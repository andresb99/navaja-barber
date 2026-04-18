import type { Metadata } from 'next';
import { PRIVATE_SECTION_METADATA } from '@/lib/site-metadata';
import { requireAdmin } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { getSiteHeaderInitialState } from '@/lib/site-header-state.server';

export const metadata: Metadata = PRIVATE_SECTION_METADATA;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [ctx, headerState] = await Promise.all([
    requireAdmin(),
    getSiteHeaderInitialState(),
  ]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 1024px) {
          .glass-nav { display: none !important; }
          .main-shell { padding: 0 !important; }
          .admin-desktop-wrapper { height: 100vh; display: flex; overflow: hidden; }
          .admin-desktop-main { flex: 1; overflow-y: auto; }
        }
      ` }} />
      <div className="admin-desktop-wrapper w-full bg-[#121016] text-white">
        <AdminSidebar
          workspaceName={ctx.shopName}
          workspacePlan="Plan Pro - Centro"
          userProfileName={headerState.profileName}
          userEmail={headerState.userEmail}
          userAvatarUrl={headerState.profileAvatarUrl}
          unreadNotifications={headerState.pendingNotificationCount}
          role={headerState.role}
          activeWorkspaceSlug={headerState.selectedWorkspaceSlug}
          isPlatformAdmin={headerState.isPlatformAdmin}
        />
        <main className="admin-desktop-main w-full bg-[#121016]">
          <div className="mx-auto max-w-[1440px] p-6 lg:p-10">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
