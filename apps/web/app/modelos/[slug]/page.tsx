import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { getOpenModelCalls } from '@/lib/modelos';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildTenantModelRegistrationHref, buildTenantPublicHref } from '@/lib/shop-links';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { Container } from '@/components/heroui/container';

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
    <section className="min-h-screen bg-[#131315] font-sans text-white pb-32">
      <div className="px-6 pt-6">
        <Container variant="hero" className="relative px-6 py-20 md:px-16 md:py-32 overflow-hidden rounded-[2.5rem] bg-[#0e0e10] ring-1 ring-white/5 shadow-2xl max-w-[1440px] mx-auto">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[#0e0e10]/70 backdrop-blur-[2px] z-10" />
            <img
              src="https://images.unsplash.com/photo-1541577141970-1bc56ea474eb?q=80&w=2670&auto=format&fit=crop"
              alt="Modelos Showcase"
              className="h-full w-full object-cover opacity-50 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/80 to-transparent z-10" />
          </div>

          <div className="relative z-10 grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end w-full">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#a078ff]">
                The Showcase
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-heading)] text-5xl font-extrabold uppercase tracking-tighter text-white md:text-7xl lg:text-[6rem] leading-[0.9]">
                MODELOS
              </h1>
              <p className="mt-6 text-lg text-[#cbc3d7] font-light leading-relaxed max-w-xl">
                Sé parte de nuestro portafolio editorial. Participa en sesiones exclusivas, prácticas de academia y shootings de colección de {shop.name}.
              </p>
              <div className="mt-8">
                <Link
                  href={buildTenantModelRegistrationHref(shop.slug, routeContext.mode)}
                  className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-[2rem] bg-[#d0bcff] px-10 py-6 text-sm font-bold uppercase tracking-widest text-[#23005c] transition-all hover:bg-[#e9ddff] hover:scale-105 shadow-[0_0_60px_-15px_rgba(208,188,255,0.5)]"
                >
                  Postular al Casting General
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:w-[450px]">
              <div className="rounded-[1.5rem] bg-[#201f22]/80 p-6 backdrop-blur-xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff]">Sesiones</p>
                <p className="mt-2 text-3xl font-bold text-white">{openCalls.length}</p>
              </div>
              <div className="rounded-[1.5rem] bg-[#201f22]/80 p-6 backdrop-blur-xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff]">Estilo</p>
                <p className="mt-2 text-sm mt-4 font-bold text-white tracking-widest uppercase">Editorial</p>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 mt-24">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tighter text-white uppercase mb-12">
          CASTINGS Y SESIONES ABIERTAS
        </h2>
        
        {openCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-white/5 bg-[#201f22]/50 py-32 text-center backdrop-blur-sm">
            <p className="text-sm font-bold uppercase tracking-widest text-[#cbc3d7]">
              No hay convocatorias específicas para fechas concretas en este momento. Anótate al casting general arriba.
            </p>
          </div>
        ) : null}

        <div className="grid lg:grid-cols-2 gap-8">
          {openCalls.map((call) => {
            const modelCategories = Array.isArray(call.model_categories) ? call.model_categories : [];

            return (
              <article key={call.session_id} className="group overflow-hidden rounded-[2.5rem] bg-[#0e0e10] ring-1 ring-white/5 transition-all hover:bg-[#201f22] hover:-translate-y-2 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)] flex flex-col justify-between p-8 sm:p-12">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-white/5 pb-8">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff] mb-2">
                        Sesión Abierta
                      </p>
                      <h3 className="font-[family-name:var(--font-heading)] text-3xl font-extrabold text-white tracking-tight">
                        {call.course_title}
                      </h3>
                      <p className="mt-3 text-sm text-[#cbc3d7] uppercase tracking-wider font-semibold">
                        {new Date(call.start_at).toLocaleString('es-UY', { dateStyle: 'long', timeStyle: 'short' })}
                      </p>
                    </div>

                    <div className="bg-[#1a191c] rounded-2xl p-6 ring-1 ring-white/10 text-center sm:text-right min-w-[180px]">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#a078ff] mb-2">
                        Compensación
                      </p>
                      <p className="text-2xl font-black text-[#d0bcff]">
                        {call.compensation_type === 'gratis'
                          ? 'GRATIS'
                          : call.compensation_value_cents
                            ? formatCurrency(call.compensation_value_cents)
                            : call.compensation_type}
                      </p>
                      <p className="mt-2 text-xs text-[#cbc3d7] font-semibold tracking-widest">
                        CUPOS: {call.models_needed || '1'}
                      </p>
                    </div>
                  </div>

                  <p className="text-base text-[#cbc3d7] leading-relaxed mb-6 font-medium max-w-xl">
                    {call.notes_public || 'Participa en esta sesión exclusiva. Buscamos perfiles acordes al estilo y técnica propuesta.'}
                  </p>
                  
                  {modelCategories.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-10">
                      {modelCategories.map((category) => (
                        <span
                          key={`${call.session_id}-${category}`}
                          className="rounded-full border border-[#a078ff]/30 bg-[#a078ff]/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#e9ddff]"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href={buildTenantModelRegistrationHref(
                    shop.slug,
                    routeContext.mode,
                    call.session_id,
                  )}
                  className="mt-6 flex w-full items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 px-8 py-5 text-xs font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-white/10 hover:ring-[#a078ff]/50"
                >
                  Anotarme en esta sesión
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
