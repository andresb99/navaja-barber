import { AdminApplicantsViewSwitcher } from '@/components/admin/applicants-view-switcher';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Container } from '@/components/heroui/container';

interface ApplicantsPageProps {
  searchParams: Promise<{ shop?: string; view?: string }>;
}

export default async function ApplicantsPage({ searchParams }: ApplicantsPageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const viewMode = params.view === 'cards' ? 'cards' : 'table';
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: applications } = await supabase
    .from('job_applications')
    .select(
      'id, name, phone, email, instagram, experience_years, availability, cv_path, status, notes, created_at',
    )
    .eq('shop_id', ctx.shopId)
    .order('created_at', { ascending: false });

  const signedUrls = new Map<string, string>();
  for (const item of applications || []) {
    if (!item.cv_path) {
      continue;
    }
    const { data } = await admin.storage.from('cvs').createSignedUrl(String(item.cv_path), 60 * 10);
    if (data?.signedUrl) {
      signedUrls.set(String(item.id), data.signedUrl);
    }
  }
  const applicantRows = (applications || []).map((application) => ({
    id: String(application.id),
    name: String(application.name || 'Sin nombre'),
    email: String(application.email || '-'),
    phone: String(application.phone || '-'),
    instagram: String(application.instagram || 'Sin instagram'),
    experienceYearsLabel: `${String(application.experience_years || 0)} anios`,
    availability: String(application.availability || 'No informado'),
    status: String(application.status || 'new'),
    notes: String(application.notes || ''),
    createdAtLabel: new Date(String(application.created_at)).toLocaleString('es-UY'),
    cvUrl: signedUrls.get(String(application.id)) || null,
  }));

  return (
    <section className="space-y-6">
      <Container variant="pageHeader" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Postulantes</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Seguimiento del proceso de seleccion
            </h1>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              Revisa candidatos, descarga CVs y actualiza el estado del proceso.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Total
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(applications || []).length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Nuevos
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(applications || []).filter((item) => item.status === 'new').length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Con CV
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {signedUrls.size}
              </p>
            </div>
          </div>
        </div>
      </Container>

      <AdminApplicantsViewSwitcher
        rows={applicantRows}
        shopId={ctx.shopId}
        initialView={viewMode}
      />
    </section>
  );
}
