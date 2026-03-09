import type { Metadata } from 'next';
import Link from 'next/link';
import { ModelosMarketplaceList } from '@/components/public/modelos-marketplace-list';
import { listMarketplaceOpenModelCalls } from '@/lib/modelos';
import { buildSitePageMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Convocatorias para modelos',
  description:
    'Revisa convocatorias abiertas para modelos y sesiones academicas publicadas por barberias del marketplace.',
  path: '/modelos',
});

export default async function ModelosLandingPage() {
  const openCalls = await listMarketplaceOpenModelCalls();

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Modelos marketplace</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Postulate a convocatorias abiertas de distintas barberias
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Puedes revisar sesiones activas por curso y registrarte una sola vez para futuras oportunidades.
            </p>
            <div className="mt-5">
              <Link href="/modelos/registro" className="action-primary inline-flex px-6 py-2 text-sm font-semibold">
                Crear mi perfil de modelo
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Convocatorias
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">{openCalls.length}</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Modo
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">Marketplace</p>
            </div>
          </div>
        </div>
      </div>

      {openCalls.length === 0 ? (
        <div className="soft-panel rounded-[1.8rem] p-6">
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Todavia no hay convocatorias abiertas. Igual puedes crear tu perfil y quedar listo para futuras sesiones.
          </p>
        </div>
      ) : null}

      {openCalls.length > 0 ? <ModelosMarketplaceList calls={openCalls} /> : null}
    </section>
  );
}
