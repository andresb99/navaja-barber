import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import {
  AdminModelApplicationStatusForm,
  AdminModelRequirementsForm,
} from '@/components/admin/session-modelos-forms';
import { updateModelApplicationStatusAction } from '@/app/admin/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface SessionModelosPageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}

function toneForStatus(status: string): 'default' | 'success' | 'warning' | 'danger' {
  if (status === 'confirmed' || status === 'attended') {
    return 'success';
  }
  if (status === 'waitlist' || status === 'applied') {
    return 'warning';
  }
  if (status === 'rejected' || status === 'no_show') {
    return 'danger';
  }
  return 'default';
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

export default async function SessionModelosPage({
  params,
  searchParams,
}: SessionModelosPageProps) {
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
      .select(
        'id, session_id, requirements, compensation_type, compensation_value_cents, notes_public, is_open',
      )
      .eq('session_id', sessionId)
      .maybeSingle(),
    supabase
      .from('model_applications')
      .select(
        'id, session_id, model_id, status, notes_internal, created_at, models(full_name, phone, email, instagram)',
      )
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
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="hero-eyebrow">Modelos por sesion</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.2rem] dark:text-slate-100">
              Gestion de convocatoria
            </h1>
            <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
              {String((session.courses as { title?: string } | null)?.title || 'Curso')} -{' '}
              {new Date(String(session.start_at)).toLocaleString('es-UY')} -{' '}
              {String(session.location)}
            </p>
          </div>
          <Link
            href="/admin/courses"
            className="action-secondary inline-flex rounded-full px-4 py-2 text-sm font-semibold no-underline"
          >
            Volver a cursos
          </Link>
        </div>
      </div>

      {notices.ok ? <p className="status-banner success">{notices.ok}</p> : null}
      {notices.error ? <p className="status-banner error">{notices.error}</p> : null}

      <Card className="soft-panel rounded-[1.8rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
            Configuracion de convocatoria
          </h3>
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Define cupos, requisitos y condiciones para la sesion.
          </p>
          <AdminModelRequirementsForm
            sessionId={sessionId}
            modelsNeeded={modelsNeeded || 1}
            hairLengthCategory={String(requirementObj.hair_length_category || 'indistinto')}
            hairType={String(requirementObj.hair_type || '')}
            compensationType={String(requirement?.compensation_type || 'gratis')}
            compensationValueCents={String(requirement?.compensation_value_cents ?? '')}
            beardRequired={Boolean(requirementObj.beard_required)}
            notesPublic={String(requirement?.notes_public || '')}
            isOpen={requirement ? !!requirement.is_open : true}
          />
        </CardBody>
      </Card>

      <Card className="soft-panel rounded-[1.8rem] border-0 shadow-none">
        <CardBody className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Postulaciones</h3>
            <Chip size="sm" radius="full" variant="flat" color="default">
              Confirmados {confirmedCount}/{modelsNeeded || 'sin cupo'}
            </Chip>
          </div>
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Confirma modelos, envialos a lista de espera o rechaza postulaciones.
          </p>
          <div className="mt-4 space-y-3">
            {pendingOrReview.length === 0 ? (
              <p className="text-sm text-slate/70">No hay postulaciones para revisar.</p>
            ) : null}
            {pendingOrReview.map((application) => (
              <div key={String(application.id)} className="surface-card rounded-2xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {String(
                      (application.models as { full_name?: string } | null)?.full_name || 'Modelo',
                    )}
                  </p>
                  <Chip
                    size="sm"
                    radius="full"
                    variant="flat"
                    color={toneForStatus(String(application.status))}
                  >
                    {labelForStatus(String(application.status))}
                  </Chip>
                </div>
                <p className="mt-1 text-xs text-slate/70">
                  {String(
                    (application.models as { phone?: string } | null)?.phone || 'Sin telefono',
                  )}{' '}
                  -{' '}
                  {String(
                    (application.models as { instagram?: string } | null)?.instagram ||
                      'Sin instagram',
                  )}
                </p>
                <AdminModelApplicationStatusForm
                  applicationId={String(application.id)}
                  status={String(application.status)}
                  notesInternal={String(application.notes_internal || '')}
                />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card className="soft-panel rounded-[1.8rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
            Confirmados y asistencia
          </h3>
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Marca asistencia o no presentacion al cierre de la sesion.
          </p>
          <div className="mt-4 space-y-3">
            {confirmedOrAttendance.length === 0 ? (
              <p className="text-sm text-slate/70">
                Todavia no hay modelos confirmados para esta sesion.
              </p>
            ) : null}
            {confirmedOrAttendance.map((application) => (
              <div key={String(application.id)} className="surface-card rounded-2xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {String(
                      (application.models as { full_name?: string } | null)?.full_name || 'Modelo',
                    )}
                  </p>
                  <Chip
                    size="sm"
                    radius="full"
                    variant="flat"
                    color={toneForStatus(String(application.status))}
                  >
                    {labelForStatus(String(application.status))}
                  </Chip>
                </div>
                <p className="mt-1 text-xs text-slate/70">
                  {String(
                    (application.models as { phone?: string } | null)?.phone || 'Sin telefono',
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={updateModelApplicationStatusAction}>
                    <input type="hidden" name="application_id" value={String(application.id)} />
                    <input type="hidden" name="status" value="attended" />
                    <Button type="submit" className="action-primary px-4 text-sm font-semibold">
                      Marcar asistio
                    </Button>
                  </form>
                  <form action={updateModelApplicationStatusAction}>
                    <input type="hidden" name="application_id" value={String(application.id)} />
                    <input type="hidden" name="status" value="no_show" />
                    <Button type="submit" color="danger" className="px-4 text-sm font-semibold">
                      Marcar no se presento
                    </Button>
                  </form>
                  <form action={updateModelApplicationStatusAction}>
                    <input type="hidden" name="application_id" value={String(application.id)} />
                    <input type="hidden" name="status" value="confirmed" />
                    <Button
                      type="submit"
                      variant="ghost"
                      className="action-secondary px-4 text-sm font-semibold"
                    >
                      Dejar confirmado
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
