import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JobsForm } from '@/components/public/jobs-form';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { Briefcase, MapPin, TrendingUp, Award, Users, Scissors } from 'lucide-react';

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
    title: `Empleo | ${shop.name}`,
    description: `Postulaciones y vacantes abiertas en ${shop.name}. Inicia tu legado aquí.`,
    section: 'jobs',
  });
}

export default async function ShopJobsPage({ params }: ShopJobsPageProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    notFound();
  }

  return (
    <section className="min-h-screen font-sans text-at-body pb-16 sm:pb-32 bg-at-page tenant-atelier">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-12 sm:pt-20 md:pt-24 space-y-16 md:space-y-24">
        
        {/* HERO SECTION */}
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-24 items-start">
          <div className="space-y-10">
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-5xl sm:text-6xl md:text-7xl lg:text-[4.8rem] xl:text-[5.5rem] font-black uppercase tracking-tighter text-at-heading leading-[0.9]">
                INICIA TU
                <br />
                <span className="text-at-accent-light">LEGADO</span> AQUÍ.
              </h1>
              <p className="mt-8 text-lg text-at-muted font-medium leading-relaxed max-w-lg">
                Estamos constantemente en la búsqueda de visionarios. Si crees que tienes la precisión y la pasión necesaria, queremos conocerte.
              </p>
            </div>

            <div className="space-y-8 pt-4 md:pt-8">
              <div className="flex items-start gap-4 md:gap-5">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-at-raised flex items-center justify-center shrink-0 ring-1 ring-at-border/5">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-at-accent-light" />
                </div>
                <div className="pt-1">
                  <h3 className="text-at-heading font-bold text-base md:text-lg tracking-tight">Ubicaciones Globales</h3>
                  <p className="text-sm text-at-muted/80 mt-1">Madrid, Barcelona, CDMX, Bogotá</p>
                </div>
              </div>
              <div className="flex items-start gap-4 md:gap-5">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-at-raised flex items-center justify-center shrink-0 ring-1 ring-at-border/5">
                  <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-at-accent-light" />
                </div>
                <div className="pt-1">
                  <h3 className="text-at-heading font-bold text-base md:text-lg tracking-tight">Flexibilidad & Beneficios</h3>
                  <p className="text-sm text-at-muted/80 mt-1">Esquemas competitivos y seguro premium</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-at-deep rounded-[2rem] p-6 lg:p-10 shadow-2xl ring-1 ring-at-border/10">
            <JobsForm shopId={shop.id} />
          </div>
        </div>



        {/* FEATURES BOTTOM */}
        <div className="grid md:grid-cols-3 gap-6 pt-4 pb-24">
          <div className="bg-at-raised/50 rounded-[2rem] p-10 ring-1 ring-at-border/5 transition-all hover:bg-at-raised/80">
            <TrendingUp className="w-6 h-6 text-at-accent-light mb-8" />
            <h3 className="text-at-heading font-black text-lg mb-4 tracking-tight uppercase">CRECIMIENTO CONTINUO</h3>
            <p className="text-at-muted/60 text-[13px] font-medium leading-relaxed">
              Acceso exclusivo a masterclasses y certificaciones internacionales. En Beardly, tu talento nunca toca techo.
            </p>
          </div>
          <div className="bg-at-raised/50 rounded-[2rem] p-10 ring-1 ring-at-border/5 transition-all hover:bg-at-raised/80">
            <Award className="w-6 h-6 text-at-accent-light mb-8" />
            <h3 className="text-at-heading font-black text-lg mb-4 tracking-tight uppercase">AMBIENTE PREMIUM</h3>
            <p className="text-at-muted/60 text-[13px] font-medium leading-relaxed">
              Espacios diseñados para la comodidad del artista y del cliente. Herramientas de última generación y diseño editorial.
            </p>
          </div>
          <div className="bg-at-raised/50 rounded-[2rem] p-10 ring-1 ring-at-border/5 transition-all hover:bg-at-raised/80">
            <Users className="w-6 h-6 text-at-accent-light mb-8" />
            <h3 className="text-at-heading font-black text-lg mb-4 tracking-tight uppercase">EQUIPO LÍDER</h3>
            <p className="text-at-muted/60 text-[13px] font-medium leading-relaxed">
              Colabora con los mejores barberos de la industria en un entorno de respeto, disciplina y creativa compartida.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
