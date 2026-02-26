import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateModelApplicationStatusAction, upsertModelRequirementsAction } from '@/app/admin/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface SessionModelosPageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}

function toneForStatus(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'confirmed' || status === 'attended') {
    return 'success';
  }
  if (status === 'waitlist' || status === 'applied') {
    return 'warning';
  }
  if (status === 'rejected' || status === 'no_show') {
    return 'danger';
  }
  return 'neutral';
}

function labelForStatus(status: string): string {
  if (status === 'confirmed') {
    return 'Confirmado';
  }
  if (status === 'attended') {
    return 'Asistio';
  }
  if (status === 'waitlist') {
    return 'Lista de espera';
  }
  if (status === 'applied') {
    return 'Postulado';
  }
  if (status === 'rejected') {
    return 'Rechazado';
  }
  if (status === 'no_show') {
    return 'No se presento';
  }
  return status;
}

export default async function SessionModelosPage({ params, searchParams }: SessionModelosPageProps) {
  const { sessionId } = await params;
  const notices = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: session } = await supabase
    .from('course_sessions')
    .select('id, start_at, location, status, course_id, courses(title)')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) {
    notFound();
  }

  const [{ data: requirement }, { data: applications }] = await Promise.all([
    supabase
      .from('model_requirements')
      .select('id, session_id, requirements, compensation_type, compensation_value_cents, notes_public, is_open')
      .eq('session_id', sessionId)
      .maybeSingle(),
    supabase
      .from('model_applications')
      .select('id, session_id, model_id, status, notes_internal, created_at, models(full_name, phone, email, instagram)')
      .eq('session_id', sessionId)
      .order('created_at'),
  ]);

  const requirementObj = (requirement?.requirements as Record<string, unknown> | null) || {};
  const modelsNeeded = Number(requirementObj.models_needed || 1);
  const confirmedCount = (applications || []).filter((item) => item.status === 'confirmed').length;

  const pendingOrReview = (applications || []).filter((item) =>
    ['applied', 'waitlist', 'rejected'].includes(String(item.status)),
  );
  const confirmedOrAttendance = (applications || []).filter((item) =>
    ['confirmed', 'attended', 'no_show'].includes(String(item.status)),
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Modelos por sesion</h1>
          <p className="mt-1 text-sm text-slate/80">
            {String((session.courses as { title?: string } | null)?.title || 'Curso')} -{' '}
            {new Date(String(session.start_at)).toLocaleString('es-UY')} - {String(session.location)}
          </p>
        </div>
        <Link href="/admin/courses" className="rounded-md border border-slate/20 px-3 py-2 text-sm no-underline">
          Volver a cursos
        </Link>
      </div>

      {notices.ok ? <p className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{notices.ok}</p> : null}
      {notices.error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{notices.error}</p> : null}

      <Card>
        <CardTitle>Configuracion de convocatoria</CardTitle>
        <CardDescription>Define cupos, requisitos y condiciones para la sesion.</CardDescription>
        <form action={upsertModelRequirementsAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="session_id" value={sessionId} />
          <div>
            <label htmlFor="models_needed">Modelos necesarios</label>
            <Input
              id="models_needed"
              name="models_needed"
              type="number"
              min={1}
              defaultValue={modelsNeeded || 1}
              required
            />
          </div>
          <div>
            <label htmlFor="hair_length_category">Largo de pelo</label>
            <Select
              id="hair_length_category"
              name="hair_length_category"
              defaultValue={String(requirementObj.hair_length_category || 'indistinto')}
            >
              <option value="indistinto">Indistinto</option>
              <option value="corto">Corto</option>
              <option value="medio">Medio</option>
              <option value="largo">Largo</option>
            </Select>
          </div>
          <div>
            <label htmlFor="hair_type">Tipo de pelo (opcional)</label>
            <Input
              id="hair_type"
              name="hair_type"
              defaultValue={String(requirementObj.hair_type || '')}
              placeholder="Ej: lacio, rulos, mixto"
            />
          </div>
          <div>
            <label htmlFor="compensation_type">Compensacion</label>
            <Select
              id="compensation_type"
              name="compensation_type"
              defaultValue={String(requirement?.compensation_type || 'gratis')}
            >
              <option value="gratis">Gratis</option>
              <option value="descuento">Descuento</option>
              <option value="pago">Pago</option>
            </Select>
          </div>
          <div>
            <label htmlFor="compensation_value_cents">Valor compensacion (cents)</label>
            <Input
              id="compensation_value_cents"
              name="compensation_value_cents"
              type="number"
              min={0}
              defaultValue={String(requirement?.compensation_value_cents ?? '')}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="beard_required" defaultChecked={Boolean(requirementObj.beard_required)} />
              Requiere barba
            </label>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="notes_public">Notas publicas</label>
            <Textarea
              id="notes_public"
              name="notes_public"
              rows={3}
              defaultValue={String(requirement?.notes_public || '')}
              placeholder="Indicaciones para quienes se postulan."
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_open" defaultChecked={requirement ? !!requirement.is_open : true} />
              Convocatoria abierta
            </label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Guardar configuracion</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Postulaciones</CardTitle>
          <Badge tone="neutral">
            Confirmados {confirmedCount}/{modelsNeeded || 'sin cupo'}
          </Badge>
        </div>
        <CardDescription>Confirma modelos, envialos a lista de espera o rechaza postulaciones.</CardDescription>
        <div className="mt-4 space-y-3">
          {pendingOrReview.length === 0 ? <p className="text-sm text-slate/70">No hay postulaciones para revisar.</p> : null}
          {pendingOrReview.map((application) => (
            <div key={String(application.id)} className="rounded-lg border border-slate/20 bg-slate/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-ink">
                  {String((application.models as { full_name?: string } | null)?.full_name || 'Modelo')}
                </p>
                <Badge tone={toneForStatus(String(application.status))}>{labelForStatus(String(application.status))}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate/70">
                {String((application.models as { phone?: string } | null)?.phone || 'Sin telefono')} -{' '}
                {String((application.models as { instagram?: string } | null)?.instagram || 'Sin instagram')}
              </p>
              <form action={updateModelApplicationStatusAction} className="mt-3 grid gap-2 md:grid-cols-[200px_1fr_auto]">
                <input type="hidden" name="application_id" value={String(application.id)} />
                <Select name="status" defaultValue={String(application.status)}>
                  <option value="confirmed">Confirmar</option>
                  <option value="waitlist">Lista de espera</option>
                  <option value="rejected">Rechazar</option>
                  <option value="applied">Pendiente</option>
                </Select>
                <Input
                  name="notes_internal"
                  defaultValue={String(application.notes_internal || '')}
                  placeholder="Nota interna"
                />
                <Button type="submit" variant="secondary">
                  Guardar
                </Button>
              </form>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Confirmados y asistencia</CardTitle>
        <CardDescription>Marca asistencia o no presentacion al cierre de la sesion.</CardDescription>
        <div className="mt-4 space-y-3">
          {confirmedOrAttendance.length === 0 ? (
            <p className="text-sm text-slate/70">Todavia no hay modelos confirmados para esta sesion.</p>
          ) : null}
          {confirmedOrAttendance.map((application) => (
            <div key={String(application.id)} className="rounded-lg border border-slate/20 bg-slate/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-ink">
                  {String((application.models as { full_name?: string } | null)?.full_name || 'Modelo')}
                </p>
                <Badge tone={toneForStatus(String(application.status))}>{labelForStatus(String(application.status))}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate/70">
                {String((application.models as { phone?: string } | null)?.phone || 'Sin telefono')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={updateModelApplicationStatusAction}>
                  <input type="hidden" name="application_id" value={String(application.id)} />
                  <input type="hidden" name="status" value="attended" />
                  <Button type="submit">Marcar asistio</Button>
                </form>
                <form action={updateModelApplicationStatusAction}>
                  <input type="hidden" name="application_id" value={String(application.id)} />
                  <input type="hidden" name="status" value="no_show" />
                  <Button type="submit" variant="danger">
                    Marcar no se presento
                  </Button>
                </form>
                <form action={updateModelApplicationStatusAction}>
                  <input type="hidden" name="application_id" value={String(application.id)} />
                  <input type="hidden" name="status" value="confirmed" />
                  <Button type="submit" variant="ghost">
                    Dejar confirmado
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
