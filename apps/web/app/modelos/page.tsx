import { formatCurrency } from '@navaja/shared';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { getOpenModelCalls } from '@/lib/modelos';

export default async function ModelosLandingPage() {
  const openCalls = await getOpenModelCalls();

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Convocatoria activa</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Modelos para practicas con una experiencia mas aspiracional
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Si quieres participar en sesiones de practica, ahora el flujo te deja ver
              convocatorias, contexto y registro con mucha mas claridad.
            </p>
            <div className="mt-5">
              <Button
                as="a"
                href="/modelos/registro"
                className="action-primary px-6 text-sm font-semibold"
              >
                Anotarme como modelo
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Convocatorias
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {openCalls.length}
              </p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Sesiones abiertas hoy.
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Contacto
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">WhatsApp</p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Coordinacion rapida luego del registro.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
          Sesiones con convocatoria abierta
        </h2>
        {openCalls.length === 0 ? (
          <Card className="soft-panel rounded-[1.7rem] border-0 shadow-none">
            <CardBody className="p-5">
              <p className="text-sm text-slate/80 dark:text-slate-300">
                No hay convocatorias abiertas en este momento.
              </p>
            </CardBody>
          </Card>
        ) : null}

        {openCalls.map((call) => (
          <Card key={call.session_id} className="soft-panel rounded-[1.8rem] border-0 shadow-none">
            <CardBody className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                    Sesion abierta
                  </p>
                  <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
                    {call.course_title}
                  </h3>
                  <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                    {new Date(call.start_at).toLocaleString('es-UY')} - {call.location}
                  </p>
                </div>
                <div className="surface-card min-w-[220px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                    Compensacion
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {call.compensation_type === 'gratis'
                      ? 'Gratis'
                      : call.compensation_value_cents
                        ? formatCurrency(call.compensation_value_cents)
                        : call.compensation_type}
                  </p>
                  <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                    Cupos: {call.models_needed || 'Sin definir'}
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate/80 dark:text-slate-300">
                {call.notes_public || 'Sin notas publicas.'}
              </p>

              <Button
                as="a"
                href={`/modelos/registro?session_id=${call.session_id}`}
                variant="flat"
                className="action-secondary w-fit px-5 text-sm font-semibold"
              >
                Anotarme en esta sesion
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
