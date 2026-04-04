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
    <main className="min-h-screen bg-transparent">
      <BookPageContent shops={shops} />
    </main>
  );
}
