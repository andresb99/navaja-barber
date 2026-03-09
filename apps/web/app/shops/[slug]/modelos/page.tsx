import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { getOpenModelCalls } from '@/lib/modelos';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildTenantModelRegistrationHref } from '@/lib/shop-links';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';

interface ShopModelosPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ShopModelosPageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    return {};
  }

  return buildTenantPageMetadata({
    shop,
    title: `Modelos y practicas en ${shop.name}`,
    description: `Convocatorias abiertas de modelos y practicas publicadas por ${shop.name}.`,
    section: 'modelos',
  });
}

export default async function ShopModelosPage({ params }: ShopModelosPageProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);
  const routeContext = await getPublicTenantRouteContext();

  if (!shop) {
    notFound();
  }

  const openCalls = await getOpenModelCalls(shop.id);

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Modelos</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Convocatorias de {shop.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Solo ves sesiones abiertas asociadas a este tenant y sus cursos.
            </p>
            <div className="mt-5">
              <Link
                href={buildTenantModelRegistrationHref(shop.slug, routeContext.mode)}
                className="action-primary inline-flex px-6 py-2 text-sm font-semibold"
              >
                Anotarme como modelo
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Convocatorias
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {openCalls.length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Tenant
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                {shop.slug}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
          Sesiones abiertas
        </h2>
        {openCalls.length === 0 ? (
          <div className="soft-panel rounded-[1.7rem] p-5">
            <p className="text-sm text-slate/80 dark:text-slate-300">
              No hay convocatorias abiertas en este momento.
            </p>
          </div>
        ) : null}

        {openCalls.map((call) => {
          const modelCategories = Array.isArray(call.model_categories) ? call.model_categories : [];

          return (
            <article key={call.session_id} className="soft-panel rounded-[1.8rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Sesion abierta
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
                  {call.course_title}
                </h3>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  {new Date(call.start_at).toLocaleString('es-UY')} - {call.location}
                </p>
              </div>

              <div className="surface-card min-w-[220px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Compensacion
                </p>
                <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                  {call.compensation_type === 'gratis'
                    ? 'Gratis'
                    : call.compensation_value_cents
                      ? formatCurrency(call.compensation_value_cents)
                      : call.compensation_type}
                </p>
                <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                  Cupos: {call.models_needed || 'Sin definir'}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate/80 dark:text-slate-300">
              {call.notes_public || 'Sin notas publicas.'}
            </p>
            {modelCategories.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {modelCategories.map((category) => (
                  <span
                    key={`${call.session_id}-${category}`}
                    className="meta-chip border-cyan-400/24 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
                  >
                    {category}
                  </span>
                ))}
              </div>
            ) : null}

            <Link
              href={buildTenantModelRegistrationHref(
                shop.slug,
                routeContext.mode,
                call.session_id,
              )}
              className="action-secondary mt-4 inline-flex px-5 py-2 text-sm font-semibold"
            >
              Anotarme en esta sesion
            </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
