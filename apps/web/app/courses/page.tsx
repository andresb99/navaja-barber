import type { Metadata } from 'next';
import { CoursesMarketplaceCatalog } from '@/components/public/courses-marketplace-catalog';
import { MarketingPanel } from '@/components/public/marketing';
import { PublicSectionEmptyState } from '@/components/public/public-section-empty-state';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { listMarketplaceShops } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import ShopCoursesPage, {
  generateMetadata as generateShopCoursesMetadata,
} from '@/app/shops/[slug]/courses/page';

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

export async function generateMetadata(): Promise<Metadata> {
  const routeContext = await getPublicTenantRouteContext();
  if (routeContext.mode !== 'path' && routeContext.shopSlug) {
    return generateShopCoursesMetadata({
      params: Promise.resolve({ slug: routeContext.shopSlug }),
    });
  }

  return buildSitePageMetadata({
    title: 'Cursos de barberia',
    description:
      'Explora cursos, workshops y formacion publicados por barberias activas dentro del marketplace.',
    path: '/courses',
  });
}

export default async function CoursesPage() {
  const routeContext = await getPublicTenantRouteContext();
  if (routeContext.mode !== 'path' && routeContext.shopSlug) {
    return ShopCoursesPage({
      params: Promise.resolve({ slug: routeContext.shopSlug }),
    });
  }

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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-black/5 pb-5 dark:border-white/[0.06]">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-brass">
            Academia
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink dark:text-white md:text-3xl">
            Cursos activos
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-slate/70 dark:bg-white/5 dark:text-white/50">
            {items.length} cursos
          </span>
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-slate/70 dark:bg-white/5 dark:text-white/50">
            {shops.length} barberías
          </span>
        </div>
      </div>

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
