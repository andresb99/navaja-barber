import { requireAdmin } from '@/lib/auth';
import { AdminTopbar } from '@/components/admin/topbar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <section>
      <AdminTopbar />
      {children}
    </section>
  );
}
