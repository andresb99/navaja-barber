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

  return (
    <section className="space-y-6">
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Academia</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Cursos ofrecidos por {shop.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Cada tenant publica sus propios workshops y sesiones sin mezclarlos con otra tienda.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Oferta
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(courses || []).length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Perfil
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">{shop.slug}</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Modalidad
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Sesiones</p>
            </div>
          </div>
        </div>
      </Container>

      <div className="grid gap-4 md:grid-cols-2">
        {(courses || []).length === 0 ? (
          <div className="soft-panel rounded-[1.8rem] p-5">
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Esta barberia aun no publico cursos activos.
            </p>
          </div>
        ) : null}

        {((courses || []) as ShopCourseRow[]).map((course) => (
          <CourseMediaCard
            key={String(course.id)}
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
            subPriceLabel={`Hasta 12 cuotas sin interes de ${formatCurrency(
              Math.max(1, Math.round(Number(course.price_cents || 0) / 12)),
            )}`}
            primaryHref={buildTenantCourseHref(shop.slug, String(course.id), routeContext.mode)}
            secondaryHref={buildTenantPublicHref(shop.slug, routeContext.mode, 'courses')}
            primaryLabel="Ver detalle"
            secondaryLabel="Ver catalogo"
          />
        ))}
      </div>
    </section>
  );
}
