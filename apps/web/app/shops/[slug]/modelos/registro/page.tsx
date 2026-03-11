import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ModelRegistrationForm } from '@/components/public/model-registration-form';
import { getOpenModelCalls } from '@/lib/modelos';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildTenantPublicHref } from '@/lib/shop-links';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { Container } from '@/components/heroui/container';

interface ShopModelRegistrationPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ShopModelRegistrationPageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    return {};
  }

  return buildTenantPageMetadata({
    shop,
    title: `Registro de modelos | ${shop.name}`,
    description: `Formulario de registro para convocatorias y practicas de ${shop.name}.`,
    section: 'modelos_registro',
    sessionId: query.session_id || null,
    noIndex: true,
  });
}

export default async function ShopModelRegistrationPage({
  params,
  searchParams,
}: ShopModelRegistrationPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const shop = await getMarketplaceShopBySlug(slug);
  const routeContext = await getPublicTenantRouteContext();

  if (!shop) {
    notFound();
  }

  const openCalls = await getOpenModelCalls(shop.id);

  return (
    <section className="space-y-6">
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Registro de modelos</p>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Postulate para las practicas de {shop.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Tu perfil y tus preferencias se guardan solo dentro de este workspace.
            </p>
            <Link
              href={buildTenantPublicHref(shop.slug, routeContext.mode, 'modelos')}
              className="mt-4 inline-flex text-sm font-semibold text-ink dark:text-slate-100"
            >
              Ver convocatorias abiertas
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Sesion
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Opcional</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Tenant
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">{shop.slug}</p>
            </div>
          </div>
        </div>
      </Container>

      <ModelRegistrationForm
        shopId={shop.id}
        {...(query.session_id ? { initialSessionId: query.session_id } : {})}
        sessions={openCalls.map((call) => {
          const modelCategories = Array.isArray(call.model_categories) ? call.model_categories : [];

          return {
            session_id: call.session_id,
            label: `${call.course_title} - ${new Date(call.start_at).toLocaleString('es-UY')}${modelCategories.length ? ` - ${modelCategories.join(', ')}` : ''}`,
          };
        })}
      />
    </section>
  );
}
