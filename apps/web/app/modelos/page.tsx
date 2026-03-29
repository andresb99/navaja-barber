import type { Metadata } from 'next';
import Link from 'next/link';
import { ModelosMarketplaceList } from '@/components/public/modelos-marketplace-list';
import {
  MarketingHero,
  MarketingPanel,
  marketingCtaClassNames,
} from '@/components/public/marketing';
import { listMarketplaceOpenModelCalls } from '@/lib/modelos';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import ShopModelosPage, {
  generateMetadata as generateShopModelosMetadata,
} from '@/app/modelos/[slug]/page';

export async function generateMetadata(): Promise<Metadata> {
  const routeContext = await getPublicTenantRouteContext();
  if (routeContext.mode !== 'path' && routeContext.shopSlug) {
    return generateShopModelosMetadata({
      params: Promise.resolve({ slug: routeContext.shopSlug }),
    });
  }

  return buildSitePageMetadata({
    title: 'Convocatorias para modelos',
    description:
      'Revisa convocatorias abiertas para modelos y sesiones academicas publicadas por barberias del marketplace.',
    path: '/modelos',
  });
}

export default async function ModelosLandingPage() {
  const routeContext = await getPublicTenantRouteContext();
  if (routeContext.mode !== 'path' && routeContext.shopSlug) {
    return ShopModelosPage({
      params: Promise.resolve({ slug: routeContext.shopSlug }),
    });
  }

  const openCalls = await listMarketplaceOpenModelCalls();

  return (
    <section className="space-y-6">
      <MarketingHero
        eyebrow="Modelos marketplace"
        title="Postulate a convocatorias abiertas de distintas barberias"
        description="Puedes revisar sesiones activas por curso y registrarte una sola vez para futuras oportunidades."
        actions={[
          {
            href: '/modelos/registro',
            label: 'Crear mi perfil de modelo',
            className: 'rounded-none px-6 py-2',
          },
        ]}
        stats={[
          {
            label: 'Convocatorias',
            value: openCalls.length,
            valueClassName: 'mt-2 text-2xl font-semibold text-ink dark:text-slate-100',
          },
          {
            label: 'Modo',
            value: 'Marketplace',
          },
        ]}
        layoutClassName="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end"
        statsClassName="grid gap-3 sm:grid-cols-2"
      />

      {openCalls.length === 0 ? (
        <MarketingPanel className="p-6">
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Todavia no hay convocatorias abiertas. Igual puedes crear tu perfil y quedar listo para
            futuras sesiones.
          </p>
          <div className="mt-4">
            <Link href="/modelos/registro" className={marketingCtaClassNames.panelPrimary}>
              Crear mi perfil
            </Link>
          </div>
        </MarketingPanel>
      ) : null}

      {openCalls.length > 0 ? <ModelosMarketplaceList calls={openCalls} /> : null}
    </section>
  );
}
