import type { Metadata } from 'next';
import Link from 'next/link';
import { ModelosMarketplaceList } from '@/components/public/modelos-marketplace-list';
import { MarketingPanel, marketingCtaClassNames } from '@/components/public/marketing';
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-black/5 pb-5 dark:border-white/[0.06]">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-brass">
            Modelos
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink dark:text-white md:text-3xl">
            Convocatorias abiertas
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {openCalls.length > 0 ? (
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-slate/70 dark:bg-white/5 dark:text-white/50">
              {openCalls.length} convocatorias
            </span>
          ) : null}
          <Link href="/modelos/registro" className="action-primary inline-flex px-6 py-2 text-sm font-semibold">
            Crear mi perfil de modelo
          </Link>
        </div>
      </div>

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
