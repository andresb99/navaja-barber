import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { CourseEnrollmentForm } from '@/components/public/course-enrollment-form';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';

interface ShopCourseDetailsPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: ShopCourseDetailsPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    return {};
  }

  const supabase = createSupabaseAdminClient();
  const { data: course } = await supabase
    .from('courses')
    .select('title, description, is_active')
    .eq('id', id)
    .eq('shop_id', shop.id)
    .maybeSingle();

  if (!course || !course.is_active) {
    return {};
  }

  return buildTenantPageMetadata({
    shop,
    title: `${String(course.title)} | ${shop.name}`,
    description: String(course.description || `Detalle del curso publicado por ${shop.name}.`),
    section: 'courses',
    courseId: id,
  });
}

export default async function ShopCourseDetailsPage({ params }: ShopCourseDetailsPageProps) {
  const { slug, id } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    notFound();
  }

  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();
  const supabase = createSupabaseAdminClient();

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, price_cents, duration_hours, level, is_active')
    .eq('id', id)
    .eq('shop_id', shop.id)
    .maybeSingle();

  if (!course || !course.is_active) {
    notFound();
  }

  const { data: sessions } = await supabase
    .from('course_sessions')
    .select('id, start_at, capacity, location, status')
    .eq('course_id', id)
    .eq('status', 'scheduled')
    .order('start_at');

  const sessionIds = (sessions || []).map((item) => item.id as string);
  const { data: enrollments } = sessionIds.length
    ? await supabase
        .from('course_enrollments')
        .select('session_id, status')
        .in('session_id', sessionIds)
        .in('status', ['pending', 'confirmed'])
    : { data: [] as Array<{ session_id: string; status: string }> };

  const enrollmentCount = new Map<string, number>();
  (enrollments || []).forEach((item) => {
    const key = String(item.session_id);
    enrollmentCount.set(key, (enrollmentCount.get(key) || 0) + 1);
  });

  const metadata = (user?.user_metadata as Record<string, unknown> | undefined) ?? undefined;
  const metadataFullName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    '';

  const { data: profile } = user?.id
    ? await sessionSupabase
        .from('user_profiles')
        .select(
          'full_name, phone, preferred_payment_method, preferred_card_brand, preferred_card_last4',
        )
        .eq('auth_user_id', user.id)
        .maybeSingle()
    : {
        data: null as {
          full_name?: string | null;
          phone?: string | null;
          preferred_payment_method?: string | null;
          preferred_card_brand?: string | null;
          preferred_card_last4?: string | null;
        } | null,
      };

  const initialName =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) || metadataFullName || '';
  const initialPhone = (typeof profile?.phone === 'string' && profile.phone.trim()) || '';
  const initialEmail = user?.email || '';
  const preferredMethodRaw =
    (typeof profile?.preferred_payment_method === 'string' &&
      profile.preferred_payment_method.trim()) ||
    null;
  const preferredCardBrand =
    (typeof profile?.preferred_card_brand === 'string' && profile.preferred_card_brand.trim()) ||
    null;
  const preferredCardLast4 =
    (typeof profile?.preferred_card_last4 === 'string' && profile.preferred_card_last4.trim()) ||
    null;
  const preferredPaymentMethod =
    preferredMethodRaw === 'card'
      ? `Tarjeta${preferredCardBrand ? ` ${preferredCardBrand}` : ''}${preferredCardLast4 ? ` ****${preferredCardLast4}` : ''}`
      : preferredMethodRaw === 'mercado_pago'
        ? 'Mercado Pago'
        : preferredMethodRaw === 'cash'
          ? 'Efectivo en local'
          : null;

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Detalle del curso</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              {String(course.title)}
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate/80 dark:text-slate-300">
              {String(course.description)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Tenant
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">{shop.slug}</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Nivel
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {String(course.level)}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Precio
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {formatCurrency(Number(course.price_cents || 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-ink dark:text-slate-100">
          Proximas sesiones
        </h2>
        {(sessions || []).length === 0 ? (
          <p className="text-sm text-slate/70">No hay sesiones programadas por ahora.</p>
        ) : null}

        {(sessions || []).map((session) => {
          const used = enrollmentCount.get(String(session.id)) || 0;
          const capacity = Number(session.capacity || 0);
          const seatsLeft = Math.max(0, capacity - used);

          return (
            <div
              key={String(session.id)}
              className="soft-panel grid gap-4 rounded-[1.8rem] border-0 p-4 md:grid-cols-[1fr_320px]"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Sesion programada
                </p>
                <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                  {new Date(String(session.start_at)).toLocaleString('es-UY')}
                </p>
                <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                  Lugar: {String(session.location)}
                </p>
                <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                  {seatsLeft} cupos disponibles
                </p>
              </div>
              <CourseEnrollmentForm
                sessionId={String(session.id)}
                initialName={initialName}
                initialPhone={initialPhone}
                initialEmail={initialEmail}
                preferredPaymentMethod={preferredPaymentMethod}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
