import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { CourseMediaCard } from '@/components/public/course-media-card';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildTenantCourseHref, buildTenantPublicHref } from '@/lib/shop-links';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { Container } from '@/components/heroui/container';
import { ShopPageBreadcrumb } from '@/components/public/shop-page-breadcrumb';

interface ShopCoursesPageProps {
  params: Promise<{ slug: string }>;
}

interface ShopCourseRow {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_hours: number;
  level: string;
  image_url: string | null;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  intermediate: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  advanced: 'bg-rose-500/15 text-rose-300 border border-rose-500/20',
};

export async function generateMetadata({ params }: ShopCoursesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    return {};
  }

  return buildTenantPageMetadata({
    shop,
    title: `Cursos de ${shop.name}`,
    description: `Catalogo de cursos, workshops y sesiones publicadas por ${shop.name}.`,
    section: 'courses',
  });
}

export default async function ShopCoursesPage({ params }: ShopCoursesPageProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);
  const routeContext = await getPublicTenantRouteContext();

  if (!shop) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, price_cents, duration_hours, level, image_url')
    .eq('shop_id', shop.id)
    .eq('is_active', true)
    .order('title');

  const courseList = (courses || []) as ShopCourseRow[];

  return (
    <section className="min-h-screen bg-[#131315] font-sans text-white pb-32">
      <div className="px-6 pt-6">
        <Container variant="hero" className="relative px-6 py-20 md:px-16 md:py-32 overflow-hidden rounded-[2.5rem] bg-[#0e0e10] ring-1 ring-white/5 shadow-2xl max-w-[1440px] mx-auto">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[#0e0e10]/70 backdrop-blur-[2px] z-10" />
            <img
              src="https://images.unsplash.com/photo-1595208630327-023a19bc7b26?q=80&w=2670&auto=format&fit=crop"
              alt="Beardly Academy"
              className="h-full w-full object-cover opacity-40 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/80 to-transparent z-10" />
          </div>

          <div className="relative z-10 grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end w-full">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#a078ff]">
                Formación Premium
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-heading)] text-5xl font-extrabold uppercase tracking-tighter text-white md:text-7xl lg:text-[6rem] leading-[0.9]">
                ACADEMIA
              </h1>
              <p className="mt-6 text-lg text-[#cbc3d7] font-light leading-relaxed max-w-xl">
                Programas de perfeccionamiento, masterclasses y sesiones exclusivas impartidas por los barberos de {shop.name}.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:w-[500px]">
              <div className="rounded-[1.5rem] bg-[#201f22]/80 p-6 backdrop-blur-xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff]">Oferta</p>
                <p className="mt-2 text-3xl font-bold text-white">{(courses || []).length}</p>
              </div>
              <div className="rounded-[1.5rem] bg-[#201f22]/80 p-6 backdrop-blur-xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff]">Base</p>
                <p className="mt-2 text-sm mt-4 font-bold text-white tracking-widest uppercase">All Levels</p>
              </div>
              <div className="rounded-[1.5rem] bg-[#201f22]/80 p-6 backdrop-blur-xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff]">Formato</p>
                <p className="mt-2 text-sm mt-4 font-bold text-white tracking-widest uppercase">Sesiones</p>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 mt-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(courses || []).length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[2.5rem] border border-white/5 bg-[#201f22]/50 py-32 text-center backdrop-blur-sm">
              <p className="text-sm font-bold uppercase tracking-widest text-[#cbc3d7]">
                Aún no hay cursos activos en esta academia
              </p>
            </div>
          ) : null}

          {((courses || []) as ShopCourseRow[]).map((course) => (
            <div key={String(course.id)} className="group relative">
              <div className="block h-full transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_-20px_rgba(160,120,255,0.2)]">
                <CourseMediaCard
                  title={String(course.title)}
                  description={String(course.description)}
                  topLabel="Curso"
                  imageUrls={[course.image_url, ...shop.imageUrls]}
                  chips={[
                    `${String(course.duration_hours)} horas`,
                    formatCurrency(Number(course.price_cents || 0)),
                  ]}
                  avatarUrl={shop.logoUrl}
                  avatarName={shop.name}
                  metaRows={[
                    { label: 'Nivel', value: String(course.level) },
                    { label: 'Duracion', value: `${String(course.duration_hours)}h` },
                    { label: 'Barberia', value: shop.name },
                  ]}
                  priceLabel={formatCurrency(Number(course.price_cents || 0))}
                  subPriceLabel={`Hasta 12 cuotas sin interes`}
                  primaryHref={buildTenantCourseHref(shop.slug, String(course.id), routeContext.mode)}
                  secondaryHref={buildTenantPublicHref(shop.slug, routeContext.mode, 'courses')}
                  primaryLabel="Ver detalle"
                  secondaryLabel="Ver catalogo"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
