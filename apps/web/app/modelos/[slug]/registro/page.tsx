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
    <section className="min-h-screen bg-[#131315] font-sans text-white pb-16 sm:pb-32">
      <div className="px-3 sm:px-6 pt-4 sm:pt-6">
        <Container variant="hero" className="relative px-4 py-8 sm:px-6 md:px-16 md:py-24 overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] bg-[#0e0e10] ring-1 ring-white/5 shadow-2xl max-w-[1440px] mx-auto">
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="hero-eyebrow text-[#a078ff]" style={{ letterSpacing: '0.3em', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Registro de modelos</p>
              <h1 className="mt-4 font-[family-name:var(--font-heading)] text-4xl sm:text-5xl font-bold text-white tracking-tighter">
                Postulate para las practicas de {shop.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/60">
                Tu perfil y tus preferencias se guardan solo dentro de este workspace.
              </p>
              <Link
                href={buildTenantPublicHref(shop.slug, routeContext.mode, 'modelos')}
                className="mt-4 inline-flex text-sm font-semibold text-[#a078ff] hover:text-[#d0bcff] transition-colors"
              >
                Ver convocatorias abiertas
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-[1.5rem] bg-[#201f22]/80 p-5 sm:p-6 backdrop-blur-xl ring-1 ring-white/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff]">Sesion</p>
                <p className="mt-2 text-lg font-semibold text-white">Opcional</p>
              </div>
              <div className="rounded-[1.5rem] bg-[#201f22]/80 p-5 sm:p-6 backdrop-blur-xl ring-1 ring-white/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a078ff]">Tenant</p>
                <p className="mt-2 text-sm font-semibold text-white truncate">{shop.slug}</p>
              </div>
            </div>
          </div>
        </Container>
      </div>

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
