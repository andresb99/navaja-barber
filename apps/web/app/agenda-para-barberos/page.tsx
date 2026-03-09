import type { Metadata } from 'next';
import Link from 'next/link';
import { buildSitePageMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Agenda para barberos',
  description:
    'Agenda digital para barberos con control de disponibilidad, canales de reserva y seguimiento de rendimiento.',
  path: '/agenda-para-barberos',
});

export default function AgendaParaBarberosPage() {
  return (
    <section className="space-y-6">
      <div className="soft-panel rounded-[1.8rem] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate/60 dark:text-slate-300/70">
          Operacion diaria
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-slate-100">
          Agenda para barberos con disponibilidad en tiempo real
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate/80 dark:text-slate-300">
          Define horarios, gestiona walk-ins y compara rendimiento por barbero para ajustar
          ocupacion y facturacion desde el panel de administracion.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/book" className="rounded-full bg-ink px-4 py-2 font-medium text-white">
            Probar reservas
          </Link>
          <Link href="/admin" className="rounded-full border border-slate/20 px-4 py-2 font-medium text-ink dark:text-slate-100">
            Ir al admin
          </Link>
        </div>
      </div>
    </section>
  );
}
