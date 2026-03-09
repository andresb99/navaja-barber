import type { Metadata } from 'next';
import { PublicSectionEmptyState } from '@/components/public/public-section-empty-state';
import { ModelRegistrationForm } from '@/components/public/model-registration-form';
import { listMarketplaceOpenModelCalls } from '@/lib/modelos';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { listMarketplaceShops } from '@/lib/shops';

interface ModelRegistrationPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Registro de modelos',
  description:
    'Crea tu perfil para postularte a futuras convocatorias y sesiones academicas del marketplace.',
  path: '/modelos/registro',
  noIndex: true,
});

export default async function ModelRegistrationPage({ searchParams }: ModelRegistrationPageProps) {
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
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Registro de modelos</p>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Crea tu perfil y postulate a distintas barberias
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Puedes elegir una barberia concreta o registrarte para futuras convocatorias de su academia.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Barberias
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">{shops.length}</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Sesiones abiertas
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">{openCalls.length}</p>
            </div>
          </div>
        </div>
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
