import type { Metadata } from 'next';
import Link from 'next/link';
import { buildSitePageMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Agenda para barberos',
  description:
    'Agenda para barberos con disponibilidad en tiempo real, estados de cita, bloqueos, ausencias y pagos online.',
  path: '/agenda-para-barberos',
});

const workflowSteps = [
  'Publica servicios, staff y horarios laborales por barberia.',
  'El cliente reserva online y el sistema revalida el slot antes de crear la cita.',
  'Admin y staff actualizan estados, cobran en local o siguen pagos online.',
  'La barberia revisa metricas, cancelaciones, refunds y rendimiento por barbero.',
] as const;

export default function AgendaParaBarberosPage() {
  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Operacion diaria</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold text-ink md:text-[3rem] dark:text-slate-100">
              Agenda para barberos con disponibilidad real y menos friccion operativa.
            </h1>
            <p className="mt-4 max-w-3xl text-base text-slate/80 dark:text-slate-300">
              Beardly conecta disponibilidad por staff, estados de cita, bloqueos, ausencias,
              cobros y rendimiento para que la agenda no se rompa entre web, mobile y mostrador.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/shops" className="action-primary rounded-full px-5 py-3 text-sm font-semibold">
                Probar reservas
              </Link>
              <Link href="/software-para-barberias" className="action-secondary rounded-full px-5 py-3 text-sm font-semibold">
                Ver plataforma completa
              </Link>
            </div>
          </div>

          <div className="soft-panel rounded-[1.8rem] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Flujo operativo
            </p>
            <div className="mt-4 space-y-3">
              {workflowSteps.map((step, index) => (
                <div key={step} className="surface-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                    Paso {index + 1}
                  </p>
                  <p className="mt-2 text-sm text-slate/85 dark:text-slate-300">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="soft-panel rounded-[1.8rem] p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
            Disponibilidad
          </h2>
          <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
            Horarios laborales, tiempo de servicio, bloqueos y citas activas se combinan para
            calcular disponibilidad real por barbero.
          </p>
        </div>
        <div className="soft-panel rounded-[1.8rem] p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
            Estados de cita
          </h2>
          <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
            Pendiente, confirmada, cancelada, no-show o realizada, con visibilidad del estado del
            pago y devoluciones cuando el local cancela.
          </p>
        </div>
        <div className="soft-panel rounded-[1.8rem] p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
            Rendimiento
          </h2>
          <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
            Ticket promedio, facturacion, ocupacion y desempeno por barbero para ajustar capacidad
            y turnos de mayor demanda.
          </p>
        </div>
      </div>
    </section>
  );
}
