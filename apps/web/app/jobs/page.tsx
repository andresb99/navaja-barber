import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketplaceJobsForm } from '@/components/public/marketplace-jobs-form';
import { PublicSectionEmptyState } from '@/components/public/public-section-empty-state';
import { buildShopHref } from '@/lib/shop-links';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { listMarketplaceShops } from '@/lib/shops';
import { Container } from '@/components/heroui/container';

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Trabajo en barberias',
  description:
    'Encuentra barberias activas para enviar tu CV directo o dejar tu perfil en la bolsa general del marketplace.',
  path: '/jobs',
});

export default async function JobsPage() {
  const shops = await listMarketplaceShops();

  if (!shops.length) {
    return (
      <PublicSectionEmptyState
        eyebrow="Empleo"
        title="Esta ruta deberia centralizar postulaciones del marketplace"
        description="Aqui se listan barberias activas para enviar un CV directo o dejarlo en una bolsa general."
      />
    );
  }

  return (
    <section className="space-y-6">
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Empleo marketplace</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Postulate a una barberia o deja tu CV en la bolsa general
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              El marketplace ya no te manda a una barberia arbitraria: puedes elegir destino o dejar
              tu perfil para toda la red.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Barberias
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {shops.length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Modalidad
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Directa o red
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                CV
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Un solo upload
              </p>
            </div>
          </div>
        </div>
      </Container>

      <MarketplaceJobsForm
        shops={shops.map((shop) => ({
          id: shop.id,
          name: shop.name,
          city: shop.city,
          region: shop.region,
        }))}
      />

      <div className="space-y-4">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
          Barberias activas
        </h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shops.map((shop) => (
            <article key={shop.id} className="soft-panel rounded-[1.8rem] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                {[shop.city, shop.region].filter(Boolean).join(' - ') || 'Uruguay'}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
                {shop.name}
              </h3>
              <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
                {shop.description || 'Postulate directo al pipeline privado de esta barberia.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={buildShopHref(shop.slug, 'jobs')}
                  className="action-primary rounded-2xl px-4 py-2 text-sm font-semibold"
                >
                  Enviar CV directo
                </Link>
                <Link
                  href={buildShopHref(shop.slug)}
                  className="action-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
                >
                  Ver barberia
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
