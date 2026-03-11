import type { Metadata } from 'next';
import { CoursesMarketplaceCatalog } from '@/components/public/courses-marketplace-catalog';
import { PublicSectionEmptyState } from '@/components/public/public-section-empty-state';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { listMarketplaceShops } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { Container } from '@/components/heroui/container';

interface CourseRow {
  id: string;
  shop_id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_hours: number;
  level: string;
  image_url: string | null;
}

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Cursos de barberia',
  description:
    'Explora cursos, workshops y formacion publicados por barberias activas dentro del marketplace.',
  path: '/courses',
});

export default async function CoursesPage() {
  const shops = await listMarketplaceShops();

  if (!shops.length) {
    return (
      <PublicSectionEmptyState
        eyebrow="Cursos"
        title="Aqui deberia vivir el catalogo global de formacion"
        description="En vez de redirigir a una barberia, esta ruta ahora lista todos los cursos activos del marketplace."
      />
    );
  }

  const supabase = createSupabaseAdminClient();
  const shopIds = shops.map((shop) => shop.id);
  const { data: courses } = await supabase
    .from('courses')
    .select('id, shop_id, title, description, price_cents, duration_hours, level, image_url')
    .in('shop_id', shopIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const shopsById = new Map(shops.map((shop) => [shop.id, shop]));
  const items = ((courses || []) as CourseRow[])
    .map((course) => {
      const shop = shopsById.get(String(course.shop_id));
      if (!shop) {
        return null;
      }

      return {
        course,
        shop,
      };
    })
    .filter((item): item is { course: CourseRow; shop: (typeof shops)[number] } => item !== null);

  return (
    <section className="space-y-6">
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Academia marketplace</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Todos los cursos activos en un solo catalogo
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Aqui comparas oferta educativa entre barberias y luego entras al detalle del tenant
              que publica el curso.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Cursos
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {items.length}
              </p>
            </div>
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
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Catalogo global
              </p>
            </div>
          </div>
        </div>
      </Container>

      {items.length === 0 ? (
        <div className="soft-panel rounded-[1.8rem] p-6">
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Todavia no hay cursos activos publicados.
          </p>
        </div>
      ) : null}

      {items.length > 0 ? <CoursesMarketplaceCatalog items={items} /> : null}
    </section>
  );
}
