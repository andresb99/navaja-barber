import type { Metadata } from 'next';
import Link from 'next/link';
import { buildSitePageMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Software para barberias',
  description:
    'Gestiona agenda, staff, reservas, cursos y marketplace desde una sola plataforma para barberias.',
  path: '/software-para-barberias',
});

export default function SoftwareParaBarberiasPage() {
  return (
    <section className="space-y-6">
      <div className="soft-panel rounded-[1.8rem] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate/60 dark:text-slate-300/70">
          Plataforma SaaS
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-slate-100">
          Software para barberias con reservas, staff y crecimiento
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate/80 dark:text-slate-300">
          Navaja centraliza agenda, cursos, captacion de modelos, postulaciones y metricas para
          que la operacion diaria del local no dependa de planillas sueltas.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/suscripcion" className="rounded-full bg-ink px-4 py-2 font-medium text-white">
            Ver planes
          </Link>
          <Link href="/shops" className="rounded-full border border-slate/20 px-4 py-2 font-medium text-ink dark:text-slate-100">
            Ver marketplace
          </Link>
        </div>
      </div>
    </section>
  );
}
