import type { Metadata } from 'next';
import { PublicSectionEmptyState } from '@/components/public/public-section-empty-state';
import { BookPageContent } from '@/components/public/book-page-content';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { listMarketplaceShops } from '@/lib/shops';
import ShopBookPage, { generateMetadata as generateShopBookMetadata } from '@/app/book/[slug]/page';

export async function generateMetadata(): Promise<Metadata> {
  const routeContext = await getPublicTenantRouteContext();
  if (routeContext.mode !== 'path' && routeContext.shopSlug) {
    return generateShopBookMetadata({
      params: Promise.resolve({ slug: routeContext.shopSlug }),
    });
  }

  return buildSitePageMetadata({
    title: 'Reservas en barberias',
    description:
      'Compara barberias activas y entra al flujo correcto de reserva para cada tenant desde el marketplace.',
    path: '/book',
  });
}

export default async function BookPage() {
  const routeContext = await getPublicTenantRouteContext();
  if (routeContext.mode !== 'path' && routeContext.shopSlug) {
    return ShopBookPage({
      params: Promise.resolve({ slug: routeContext.shopSlug }),
    });
  }

  const shops = await listMarketplaceShops();

  if (!shops.length) {
    return (
      <PublicSectionEmptyState
        eyebrow="Reservas"
        title="Elige una barberia antes de agendar"
        description="Esta ruta funciona como hub de reservas del marketplace: aqui deberias comparar barberias y entrar al flujo correcto."
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/5 pb-5 dark:border-white/[0.06]">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-brass">
            Reservas
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink dark:text-white md:text-3xl">
            Elegí tu barbería
          </h1>
        </div>
        <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-slate/70 dark:bg-white/5 dark:text-white/50">
          {shops.length} barberías
        </span>
      </div>

      <BookPageContent shops={shops} />
    </section>
  );
}
