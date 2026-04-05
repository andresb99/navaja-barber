import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOpenModelCalls } from '@/lib/modelos';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildTenantModelRegistrationHref } from '@/lib/shop-links';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { Container } from '@/components/heroui/container';
import { ModelosMarketplaceList } from '@/components/public/modelos-marketplace-list';

interface ShopModelosPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ShopModelosPageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    return {};
  }

  return buildTenantPageMetadata({
    shop,
    title: `Modelos y practicas en ${shop.name}`,
    description: `Convocatorias abiertas de modelos y practicas publicadas por ${shop.name}.`,
    section: 'modelos',
  });
}

export default async function ShopModelosPage({ params }: ShopModelosPageProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);
  const routeContext = await getPublicTenantRouteContext();

  if (!shop) {
    notFound();
  }

  const openCalls = await getOpenModelCalls(shop.id);

  return (
    <section className="min-h-screen bg-at-page font-sans text-at-body pb-16 sm:pb-32 tenant-atelier">
      <div className="px-3 sm:px-6 pt-4 sm:pt-6">
        <Container variant="hero" className="relative px-4 py-8 sm:px-6 md:px-16 md:py-32 overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] sm:rounded-[2.5rem] bg-at-deep ring-1 ring-at-border/5 shadow-2xl max-w-[1440px] mx-auto">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-at-deep/70 backdrop-blur-[2px] z-10" />
            <img
              src={shop.imageUrls[0] || "https://images.unsplash.com/photo-1541577141970-1bc56ea474eb?q=80&w=2670&auto=format&fit=crop"}
              alt="Modelos Showcase"
              className="h-full w-full object-cover opacity-50 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-at-page via-at-page/80 to-transparent z-10" />
          </div>

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end w-full">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-at-accent">
                The Showcase
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-heading)] text-5xl font-extrabold uppercase tracking-tighter text-at-heading md:text-7xl lg:text-[6rem] leading-[0.9]">
                MODELOS
              </h1>
              <p className="mt-6 text-lg text-at-muted font-light leading-relaxed max-w-xl">
                Sé parte de nuestro portafolio editorial. Participa en sesiones exclusivas, prácticas de academia y shootings de colección de {shop.name}.
              </p>
              <div className="mt-8">
                <Link
                  href={buildTenantModelRegistrationHref(shop.slug, routeContext.mode)}
                  className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] bg-at-accent-light px-6 sm:px-10 py-4 sm:py-6 text-xs sm:text-sm font-bold uppercase tracking-widest text-at-accent-on shadow-[0_0_60px_-15px_rgba(196,156,255,0.5)] hover:scale-[1.01] transition-all"
                >
                  Postular al Casting General
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:w-[450px]">
              <div className="rounded-[1.5rem] bg-at-raised/80 p-6 backdrop-blur-xl ring-1 ring-at-border/10 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-at-accent">Sesiones</p>
                <p className="mt-2 text-3xl font-bold text-at-heading">{openCalls.length}</p>
              </div>
              <div className="rounded-[1.5rem] bg-at-raised/80 p-6 backdrop-blur-xl ring-1 ring-at-border/10 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-at-accent">Estilo</p>
                <p className="mt-2 text-sm mt-4 font-bold text-at-heading tracking-widest uppercase">Editorial</p>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 mt-8 sm:mt-12 md:mt-24">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tighter text-at-heading uppercase mb-12">
          CASTINGS Y SESIONES ABIERTAS
        </h2>

        <ModelosMarketplaceList calls={openCalls} />
      </div>
    </section>
  );
}
