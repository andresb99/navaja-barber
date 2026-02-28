import { Card, CardBody } from '@heroui/card';
import { ApplicantUpdateForm } from '@/components/admin/applicant-update-form';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function ApplicantsPage() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: applications } = await supabase
    .from('job_applications')
    .select(
      'id, name, phone, email, instagram, experience_years, availability, cv_path, status, notes, created_at',
    )
    .eq('shop_id', SHOP_ID)
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

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
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
      </div>

      <div className="space-y-4">
        {(applications || []).map((application) => (
          <Card
            key={String(application.id)}
            className="soft-panel rounded-[1.8rem] border-0 shadow-none"
          >
            <CardBody className="p-5">
              <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
                {String(application.name)}
              </h3>
              <p className="text-sm text-slate/80 dark:text-slate-300">
                {String(application.email)} - {String(application.phone)} -{' '}
                {String(application.experience_years)} anios
              </p>

              <p className="mt-2 text-sm text-slate/80">
                Instagram: {String(application.instagram || 'No informado')}
                <br />
                Disponibilidad: {String(application.availability)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {signedUrls.get(String(application.id)) ? (
                  <a
                    href={signedUrls.get(String(application.id))}
                    target="_blank"
                    rel="noreferrer"
                    className="action-secondary inline-flex rounded-full px-4 py-2 no-underline text-xs font-semibold uppercase tracking-[0.14em]"
                  >
                    Descargar CV
                  </a>
                ) : (
                  <span className="text-slate/60">CV no disponible</span>
                )}
                <span className="text-slate/60">
                  Postulacion: {new Date(String(application.created_at)).toLocaleString('es-UY')}
                </span>
              </div>

              <ApplicantUpdateForm
                applicationId={String(application.id)}
                status={String(application.status)}
                notes={String(application.notes || '')}
              />
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
