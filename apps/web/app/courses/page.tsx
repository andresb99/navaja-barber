import type { Metadata } from 'next';
import { CoursesMarketplaceCatalog } from '@/components/public/courses-marketplace-catalog';
import { MarketingHero, MarketingPanel } from '@/components/public/marketing';
import { PublicSectionEmptyState } from '@/components/public/public-section-empty-state';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { listMarketplaceShops } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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
      <MarketingHero
        eyebrow="Academia marketplace"
        title="Todos los cursos activos en un solo catalogo"
        description="Aqui comparas oferta educativa entre barberias y luego entras al detalle del tenant que publica el curso."
        stats={[
          {
            label: 'Cursos',
            value: items.length,
            valueClassName: 'mt-2 text-2xl font-semibold text-ink dark:text-slate-100',
          },
          {
            label: 'Barberias',
            value: shops.length,
            valueClassName: 'mt-2 text-2xl font-semibold text-ink dark:text-slate-100',
          },
          {
            label: 'Cobertura',
            value: 'Catalogo global',
          },
        ]}
      />

      {items.length === 0 ? (
        <MarketingPanel className="p-6">
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Todavia no hay cursos activos publicados.
          </p>
        </MarketingPanel>
      ) : null}

      {items.length > 0 ? <CoursesMarketplaceCatalog items={items} /> : null}
    </section>
  );
}
