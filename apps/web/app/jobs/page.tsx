import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketplaceJobsForm } from '@/components/public/marketplace-jobs-form';
import {
  MarketingHero,
  MarketingPanel,
  marketingCtaClassNames,
} from '@/components/public/marketing';
import { PublicSectionEmptyState } from '@/components/public/public-section-empty-state';
import { buildShopHref } from '@/lib/shop-links';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { listMarketplaceShops } from '@/lib/shops';

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
      <MarketingHero
        eyebrow="Empleo marketplace"
        title="Postulate a una barberia o deja tu CV en la bolsa general"
        description="El marketplace ya no te manda a una barberia arbitraria: puedes elegir destino o dejar tu perfil para toda la red."
        stats={[
          {
            label: 'Barberias',
            value: shops.length,
            valueClassName: 'mt-2 text-2xl font-semibold text-ink dark:text-slate-100',
          },
          {
            label: 'Modalidad',
            value: 'Directa o red',
          },
          {
            label: 'CV',
            value: 'Un solo upload',
          },
        ]}
      />

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
            <MarketingPanel
              key={shop.id}
              eyebrow={[shop.city, shop.region].filter(Boolean).join(' - ') || 'Uruguay'}
              eyebrowClassName="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400"
              title={shop.name}
              titleClassName="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100"
              description={
                shop.description || 'Postulate directo al pipeline privado de esta barberia.'
              }
            >
              <div className="flex flex-wrap gap-3">
                <Link
                  href={buildShopHref(shop.slug, 'jobs')}
                  className={marketingCtaClassNames.panelPrimary}
                >
                  Enviar CV directo
                </Link>
                <Link
                  href={buildShopHref(shop.slug)}
                  className={marketingCtaClassNames.panelSecondary}
                >
                  Ver barberia
                </Link>
              </div>
            </MarketingPanel>
          ))}
        </div>
      </div>
    </section>
  );
}
