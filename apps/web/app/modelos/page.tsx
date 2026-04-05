import type { Metadata } from 'next';
import Link from 'next/link';
import { ModelosMarketplaceList } from '@/components/public/modelos-marketplace-list';
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
    <div className="relative pb-24">
      {/* ── ATMOSPHERIC HERO (Replicating Tenant Distribution) ── */}
      <div className="px-0 sm:px-0 pt-0">
        <div className="relative px-6 py-16 md:px-16 md:py-32 overflow-hidden rounded-[2.5rem] bg-slate-900 dark:bg-[#0d0d0f] ring-1 ring-white/5 shadow-2xl mx-auto mb-16 md:mb-24">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-[2px] z-10" />
            <img
              src="https://images.unsplash.com/photo-1512690196162-458d9bc6713c?q=80&w=2670&auto=format&fit=crop"
              alt="Modelos Showcase"
              className="h-full w-full object-cover opacity-40 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 dark:from-[#0d0d0f] via-slate-900/40 dark:via-black/20 to-transparent z-10" />
          </div>

          <div className="relative z-10 grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end w-full">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c49cff] mb-4">
                The Showcase
              </p>
              <h1 className="font-[family-name:var(--font-heading)] text-6xl md:text-8xl lg:text-[7rem] font-black uppercase tracking-tighter text-white leading-[0.85] italic">
                MODELOS
              </h1>
              <p className="mt-8 text-lg md:text-xl text-white/50 font-medium leading-relaxed max-w-xl">
                Sé parte de nuestro portafolio editorial. Participa en sesiones exclusivas, prácticas de academia y shootings de colección de test mercado pago.
              </p>
              <div className="mt-10">
                <Link
                  href="/modelos/registro"
                  className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-[#c49cff] px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#2d0a6e] shadow-[0_20px_50px_-10px_rgba(196,156,255,0.45)] hover:scale-[1.02] transition-all hover:shadow-[0_25px_60px_-10px_rgba(196,156,255,0.6)]"
                >
                  POSTULAR AL CASTING GENERAL
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 lg:w-[450px]">
              <div className="flex-1 rounded-[2rem] bg-white/[0.03] p-8 backdrop-blur-3xl ring-1 ring-white/10 transition-all duration-500 hover:bg-white/[0.06] group">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c49cff]/60 group-hover:text-[#c49cff]">SESIONES</p>
                <p className="mt-2 text-5xl font-black text-white italic tracking-tighter">{openCalls.length}</p>
              </div>
              <div className="flex-1 rounded-[2rem] bg-white/[0.03] p-8 backdrop-blur-3xl ring-1 ring-white/10 transition-all duration-500 hover:bg-white/[0.06] group">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c49cff]/60 group-hover:text-[#c49cff]">ESTILO</p>
                <p className="mt-4 text-[13px] font-black text-white tracking-[0.3em] uppercase">EDITORIAL</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-black tracking-widest text-slate-900 dark:text-white uppercase">
          CASTINGS Y SESIONES ABIERTAS
        </h2>

        {openCalls.length === 0 ? (
          <section className="py-20 text-center rounded-[2.5rem] bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
            <div className="max-w-2xl mx-auto space-y-6">
              <h3 className="text-2xl font-black tracking-tighter text-slate-400 dark:text-white/20 uppercase">
                No hay convocatorias <span className="text-[#c49cff]/20 italic">actualmente</span>
              </h3>
              <p className="text-slate-500 dark:text-white/40 text-sm leading-relaxed max-w-md mx-auto">
                Todavía no hay convocatorias abiertas en el marketplace. <br/>
                Igual puedes crear tu perfil y quedar listo para futuras sesiones.
              </p>
            </div>
          </section>
        ) : (
          <ModelosMarketplaceList calls={openCalls} />
        )}
      </div>
    </div>
  );
}
