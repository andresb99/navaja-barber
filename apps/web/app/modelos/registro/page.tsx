import type { Metadata } from 'next';
import { PublicSectionEmptyState } from '@/components/public/public-section-empty-state';
import { ModelRegistrationForm } from '@/components/public/model-registration-form';
import { listMarketplaceOpenModelCalls } from '@/lib/modelos';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { listMarketplaceShops } from '@/lib/shops';
import ShopModelRegistrationPage, {
  generateMetadata as generateShopModelRegistrationMetadata,
} from '@/app/modelos/[slug]/registro/page';

interface ModelRegistrationPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export async function generateMetadata({
  searchParams,
}: ModelRegistrationPageProps): Promise<Metadata> {
  const routeContext = await getPublicTenantRouteContext();
  if (routeContext.mode !== 'path' && routeContext.shopSlug) {
    return generateShopModelRegistrationMetadata({
      params: Promise.resolve({ slug: routeContext.shopSlug }),
      searchParams,
    });
  }

  return buildSitePageMetadata({
    title: 'Registro de modelos',
    description:
      'Crea tu perfil para postularte a futuras convocatorias y sesiones academicas del marketplace.',
    path: '/modelos/registro',
    noIndex: true,
  });
}

export default async function ModelRegistrationPage({ searchParams }: ModelRegistrationPageProps) {
  const routeContext = await getPublicTenantRouteContext();
  if (routeContext.mode !== 'path' && routeContext.shopSlug) {
    return ShopModelRegistrationPage({
      params: Promise.resolve({ slug: routeContext.shopSlug }),
      searchParams,
    });
  }

  const [shops, openCalls, params] = await Promise.all([
    listMarketplaceShops(),
    listMarketplaceOpenModelCalls(),
    searchParams,
  ]);

  if (!shops.length) {
    return (
      <PublicSectionEmptyState
        eyebrow="Registro de modelos"
        title="Necesitas al menos una barberia activa para registrarte"
        description="Esta pantalla centraliza el registro de modelos para todo el marketplace."
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/5 pb-5 dark:border-white/[0.06]">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-brass">
            Modelos
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink dark:text-white md:text-3xl">
            Registro de modelo
          </h1>
        </div>
        {openCalls.length > 0 && (
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-slate/70 dark:bg-white/5 dark:text-white/50">
            {openCalls.length} sesiones abiertas
          </span>
        )}
      </div>

      <ModelRegistrationForm
        shops={shops.map((shop) => ({
          shop_id: shop.id,
          label: [shop.name, shop.city || shop.region].filter(Boolean).join(' - '),
        }))}
        {...(params.session_id ? { initialSessionId: params.session_id } : {})}
        sessions={openCalls.map((call) => {
          const modelCategories = Array.isArray(call.model_categories) ? call.model_categories : [];

          return {
            session_id: call.session_id,
            shop_id: call.shop_id,
            label: `${call.shop_name} - ${call.course_title} - ${new Date(call.start_at).toLocaleString('es-UY')}${modelCategories.length ? ` - ${modelCategories.join(', ')}` : ''}`,
          };
        })}
      />
    </section>
  );
}
