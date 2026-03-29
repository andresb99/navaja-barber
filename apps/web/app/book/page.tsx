import type { Metadata } from 'next';
import { PublicSectionEmptyState } from '@/components/public/public-section-empty-state';
import { BookPageContent } from '@/components/public/book-page-content';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { listMarketplaceShops } from '@/lib/shops';
import { Container } from '@/components/heroui/container';
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
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Reservas marketplace</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Selecciona una barberia y entra a su agenda
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Busca por nombre o zona, filtra por calificacion y reserva directo en tu barberia.
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
                Cobertura
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Uruguay</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Flujo
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Elegir y reservar
              </p>
            </div>
          </div>
        </div>
      </Container>

      <BookPageContent shops={shops} />
    </section>
  );
}
