import Link from 'next/link';
import { formatCurrency } from '@navaja/shared';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getOpenModelCalls } from '@/lib/modelos';

export default async function ModelosLandingPage() {
  const openCalls = await getOpenModelCalls();

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-8">
        <div className="relative z-10">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.1rem] dark:text-slate-100">
            Convocatoria de modelos para practicas
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
            Si queres colaborar como modelo en cursos de barberia, completa el registro. Te contactamos por WhatsApp
            para coordinar.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/modelos/registro" className="no-underline">
                Anotarme como modelo
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
          Sesiones con convocatoria abierta
        </h2>
        {openCalls.length === 0 ? (
          <Card>
            <CardDescription>No hay convocatorias abiertas en este momento.</CardDescription>
          </Card>
        ) : null}
        {openCalls.map((call) => (
          <Card key={call.session_id}>
            <CardTitle>{call.course_title}</CardTitle>
            <CardDescription>
              {new Date(call.start_at).toLocaleString('es-UY')} - {call.location}
            </CardDescription>
            <p className="mt-2 text-sm text-slate/80">
              Cupos de modelos: {call.models_needed || 'Sin definir'} - Compensacion:{' '}
              {call.compensation_type === 'gratis'
                ? 'Gratis'
                : call.compensation_value_cents
                  ? formatCurrency(call.compensation_value_cents)
                  : call.compensation_type}
            </p>
            <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{call.notes_public || 'Sin notas publicas.'}</p>
            <div className="mt-4">
              <Button asChild variant="secondary">
                <Link href={`/modelos/registro?session_id=${call.session_id}`} className="no-underline">
                  Anotarme en esta sesion
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
