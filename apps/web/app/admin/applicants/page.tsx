import { SHOP_ID } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateJobApplicationAction } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default async function ApplicantsPage() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: applications } = await supabase
    .from('job_applications')
    .select('id, name, phone, email, instagram, experience_years, availability, cv_path, status, notes, created_at')
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
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Postulantes</h1>
        <p className="mt-1 text-sm text-slate/80">Revisa candidatos y actualiza el estado del proceso.</p>
      </div>

      <div className="space-y-4">
        {(applications || []).map((application) => (
          <Card key={String(application.id)}>
            <CardTitle>{String(application.name)}</CardTitle>
            <CardDescription>
              {String(application.email)} - {String(application.phone)} - {String(application.experience_years)} anios
            </CardDescription>

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
                  className="rounded-md bg-slate/10 px-3 py-2 no-underline"
                >
                  Descargar CV
                </a>
              ) : (
                <span className="text-slate/60">CV no disponible</span>
              )}
              <span className="text-slate/60">Postulacion: {new Date(String(application.created_at)).toLocaleString('es-UY')}</span>
            </div>

            <form action={updateJobApplicationAction} className="mt-4 space-y-2">
              <input type="hidden" name="application_id" value={String(application.id)} />
              <Select name="status" defaultValue={String(application.status)}>
                <option value="new">Nuevo</option>
                <option value="contacted">Contactado</option>
                <option value="interview">Entrevista</option>
                <option value="rejected">Rechazado</option>
                <option value="hired">Contratado</option>
              </Select>
              <Textarea name="notes" rows={3} defaultValue={String(application.notes || '')} placeholder="Notas internas" />
              <Button type="submit" variant="secondary">
                Actualizar postulacion
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </section>
  );
}
