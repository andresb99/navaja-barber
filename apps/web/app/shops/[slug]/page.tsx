import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildTenantPublicHref } from '@/lib/shop-links';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';

interface ShopProfilePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ShopProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    return {};
  }

  return buildTenantPageMetadata({
    shop,
    title: `${shop.name} | Perfil`,
    description:
      shop.description || `Servicios, staff, reservas y branding de ${shop.name} en un solo lugar.`,
    section: 'profile',
  });
}

export default async function ShopProfilePage({ params }: ShopProfilePageProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);
  const routeContext = await getPublicTenantRouteContext();

  if (!shop) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: services }, { data: staff }, { data: reviews }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_cents, duration_minutes')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('price_cents'),
    supabase
      .from('staff')
      .select('id, name, role')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('appointment_reviews')
      .select('staff_id, rating, comment, submitted_at')
      .eq('shop_id', shop.id)
      .eq('status', 'published')
      .eq('is_verified', true)
      .order('submitted_at', { ascending: false })
      .limit(3),
  ]);

  const staffById = new Map((staff || []).map((item) => [String(item.id), String(item.name)]));

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">{shop.isVerified ? 'Barbershop verificada' : 'Barbershop activa'}</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.45rem] dark:text-slate-100">
              {shop.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate/80 dark:text-slate-300">
              {shop.description || 'Este workspace ya puede recibir reservas, resenas, postulaciones y cursos.'}
            </p>
            <p className="mt-3 text-sm text-slate/75 dark:text-slate-400">
              {[shop.locationLabel, shop.city, shop.region].filter(Boolean).join(' - ') ||
                'Ubicacion en configuracion'}{' '}
              • {shop.timezone}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Rating
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {shop.averageRating ? shop.averageRating.toFixed(1) : 'Nuevo'}
              </p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                {shop.reviewCount > 0 ? `${shop.reviewCount} resenas` : 'Sin resenas publicas'}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Staff
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(staff || []).length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Servicios
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(services || []).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={buildTenantPublicHref(shop.slug, routeContext.mode, 'book')}
          className="action-primary px-5 py-2 text-sm font-semibold"
        >
          Reservar cita
        </Link>
        <Link
          href={buildTenantPublicHref(shop.slug, routeContext.mode, 'jobs')}
          className="action-secondary px-5 py-2 text-sm font-semibold"
        >
          Enviar CV
        </Link>
        <Link
          href={buildTenantPublicHref(shop.slug, routeContext.mode, 'modelos')}
          className="action-secondary px-5 py-2 text-sm font-semibold"
        >
          Aplicar como modelo
        </Link>
        <Link
          href={buildTenantPublicHref(shop.slug, routeContext.mode, 'courses')}
          className="action-secondary px-5 py-2 text-sm font-semibold"
        >
          Ver cursos
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="soft-panel rounded-[1.8rem] p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
            Servicios y pricing
          </h2>
          <div className="mt-4 space-y-3">
            {(services || []).length === 0 ? (
              <p className="text-sm text-slate/80 dark:text-slate-300">
                Esta barberia aun no publico servicios activos.
              </p>
            ) : null}
            {(services || []).map((service) => (
              <div
                key={String(service.id)}
                className="surface-card flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">
                    {String(service.name)}
                  </p>
                  <p className="text-xs text-slate/75 dark:text-slate-400">
                    {Number(service.duration_minutes || 0)} min
                  </p>
                </div>
                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                  {formatCurrency(Number(service.price_cents || 0))}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="soft-panel rounded-[1.8rem] p-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
            Staff profiles
          </h2>
          <div className="mt-4 space-y-3">
            {(staff || []).length === 0 ? (
              <p className="text-sm text-slate/80 dark:text-slate-300">
                Esta barberia aun no publico staff activa.
              </p>
            ) : null}
            {(staff || []).map((member) => (
              <div
                key={String(member.id)}
                className="surface-card flex items-center justify-between gap-4"
              >
                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                  {String(member.name)}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-slate/70 dark:text-slate-400">
                  {String(member.role)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="soft-panel rounded-[1.8rem] p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
          Resenas recientes
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(reviews || []).length === 0 ? (
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Esta barberia todavia no tiene resenas publicadas.
            </p>
          ) : null}
          {(reviews || []).map((review, index) => (
            <div key={`${String(review.staff_id)}-${index}`} className="surface-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                {staffById.get(String(review.staff_id)) || 'Barbero'}
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {Number(review.rating || 0).toFixed(1)} / 5
              </p>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                {String(review.comment || 'Sin comentario publico.')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
