import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { CourseEnrollmentForm } from '@/components/public/course-enrollment-form';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { Container } from '@/components/heroui/container';

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

  const sessionList = sessions || [];

  return (
    <section className="space-y-8">
      {/* Hero */}
      <Container variant="hero" className="soft-panel px-6 py-9 md:px-10 md:py-12">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="hero-eyebrow">Curso &middot; {shop.name}</p>
            <h1 className="mt-4 font-[family-name:var(--font-heading)] text-4xl font-bold leading-tight text-ink dark:text-slate-100 md:text-[2.75rem]">
              {String(course.title)}
            </h1>
            {course.description ? (
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {String(course.description)}
              </p>
            ) : null}
          </div>

          {/* Pill badges */}
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <div className="flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 dark:border-violet-500/30 dark:bg-violet-500/10">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300">
                Precio
              </span>
              <span className="text-xl font-bold text-violet-700 dark:text-violet-200">
                {formatCurrency(Number(course.price_cents || 0))}
              </span>
            </div>
            {course.level ? (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-600/40 dark:bg-slate-800/50">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Nivel
                </span>
                <span className="text-sm font-semibold capitalize text-ink dark:text-slate-100">
                  {String(course.level)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </Container>

      {/* Sessions */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink dark:text-slate-100">
            Pr&oacute;ximas sesiones
          </h2>
          {sessionList.length > 0 ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {sessionList.length}
            </span>
          ) : null}
        </div>

        {sessionList.length === 0 ? (
          <div className="surface-card flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 text-slate-400 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
            </div>
            <p className="text-base font-medium text-ink dark:text-slate-200">
              Sin sesiones programadas
            </p>
            <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
              No hay sesiones disponibles en este momento. Volvé a consultar pronto.
            </p>
          </div>
        ) : null}

        {sessionList.map((session) => {
          const used = enrollmentCount.get(String(session.id)) || 0;
          const capacity = Number(session.capacity || 0);
          const seatsLeft = Math.max(0, capacity - used);

          const sessionDate = new Date(String(session.start_at));
          const dateLabel = sessionDate.toLocaleDateString('es-UY', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          const timeLabel = sessionDate.toLocaleTimeString('es-UY', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const seatsPillClass =
            seatsLeft === 0
              ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30'
              : seatsLeft <= 3
                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30';

          const seatsLabel =
            seatsLeft === 0
              ? 'Sin cupos'
              : seatsLeft === 1
                ? '1 cupo disponible'
                : `${seatsLeft} cupos disponibles`;

          return (
            <div
              key={String(session.id)}
              className="soft-panel grid gap-6 rounded-[1.8rem] border-0 p-6 md:grid-cols-[1fr_320px] md:items-start md:p-8"
            >
              {/* Session info */}
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Sesi&oacute;n programada
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold capitalize text-ink dark:text-slate-100 md:text-3xl">
                    {dateLabel}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-violet-600 dark:text-violet-400">
                    {timeLabel}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                      />
                    </svg>
                    <span>{String(session.location)}</span>
                  </div>

                  {/* Seats pill */}
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${seatsPillClass}`}
                  >
                    {seatsLabel}
                  </span>
                </div>
              </div>

              {/* Enrollment form panel */}
              <div>
                <CourseEnrollmentForm
                  sessionId={String(session.id)}
                  initialName={initialName}
                  initialPhone={initialPhone}
                  initialEmail={initialEmail}
                  preferredPaymentMethod={preferredPaymentMethod}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
