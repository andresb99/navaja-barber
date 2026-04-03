import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JobsForm } from '@/components/public/jobs-form';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildTenantPublicHref } from '@/lib/shop-links';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { Container } from '@/components/heroui/container';
import { ShopPageBreadcrumb } from '@/components/public/shop-page-breadcrumb';

interface ShopJobsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ShopJobsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    return {};
  }

  return buildTenantPageMetadata({
    shop,
    title: `Trabaja en ${shop.name}`,
    description: `Postulaciones y vacantes abiertas dentro del workspace de ${shop.name}.`,
    section: 'jobs',
  });
}

export default async function ShopJobsPage({ params }: ShopJobsPageProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);
  const routeContext = await getPublicTenantRouteContext();

  if (!shop) {
    notFound();
  }

  return (
    <section className="min-h-screen bg-[#131315] font-sans text-white pb-32">
      <div className="px-6 pt-6">
        <Container variant="hero" className="relative px-6 py-20 md:px-16 md:py-32 overflow-hidden rounded-[2.5rem] bg-[#0e0e10] ring-1 ring-white/5 shadow-2xl max-w-[1440px] mx-auto">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[#0e0e10]/80 backdrop-blur-[2px] z-10" />
            <img
              src="https://images.unsplash.com/photo-1520630685935-8669e0004ff4?q=80&w=2670&auto=format&fit=crop"
              alt="Atelier Careers"
              className="h-full w-full object-cover opacity-50 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/80 to-transparent z-10" />
          </div>

          <div className="relative z-10 grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end w-full">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#a078ff]">
                Cultura & Talentos
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-heading)] text-5xl font-extrabold uppercase tracking-tighter text-white md:text-7xl lg:text-[6rem] leading-[0.9]">
                EMPLEO
              </h1>
              <p className="mt-6 text-lg text-[#cbc3d7] font-light leading-relaxed max-w-xl">
                Buscamos artesanos apasionados que quieran elevar su carrera. Únete a la cultura de {shop.name} y domina tu oficio.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:w-[450px]">
              <div className="rounded-[1.5rem] bg-[#201f22]/80 p-6 backdrop-blur-xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff]">Crecimiento</p>
                <p className="mt-2 text-sm mt-4 font-bold text-white tracking-widest uppercase">Continuo</p>
              </div>
              <div className="rounded-[1.5rem] bg-[#201f22]/80 p-6 backdrop-blur-xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff]">Ambiente</p>
                <p className="mt-2 text-sm mt-4 font-bold text-white tracking-widest uppercase">Premium</p>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 mt-24">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-24 relative">
          <div className="hidden lg:block sticky top-32 h-fit">
            <p className="text-3xl font-extrabold tracking-tight text-white mb-6 uppercase">
              "No buscamos empleados. Buscamos artistas."
            </p>
            <div className="w-full aspect-[4/5] overflow-hidden rounded-[2.5rem] ring-1 ring-white/5 shadow-2xl relative group">
               <img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1500&auto=format&fit=crop" className="w-full h-full object-cover grayscale opacity-60 transition-transform duration-700 group-hover:scale-105" />
               <div className="absolute inset-0 bg-gradient-to-t from-[rgba(14,14,16,0.9)] to-transparent" />
               <div className="absolute bottom-8 left-8 right-8">
                  <p className="text-[#a078ff] text-[10px] uppercase tracking-widest font-bold mb-2">Workspace</p>
                  <p className="text-xl font-bold text-white">{shop.name}</p>
               </div>
            </div>
          </div>

          <div className="bg-[#0e0e10] p-8 md:p-12 lg:p-16 rounded-[2.5rem] ring-1 ring-white/5 border border-transparent shadow-[0_0_80px_rgba(0,0,0,0.3)]">
            <h3 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tighter text-white uppercase mb-4">Postúlate</h3>
            <p className="text-[#cbc3d7] text-sm mb-12 uppercase tracking-wide font-semibold">Completa tus datos y analizaremos tu perfil con absoluta confidencialidad.</p>
            {/* The child component handles its form naturally, but we present it inside an elevated card */}
            <div className="jobs-form-wrapper theme-dark">
              <JobsForm shopId={shop.id} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
