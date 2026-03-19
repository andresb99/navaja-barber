import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { CourseEnrollmentForm } from '@/components/public/course-enrollment-form';
import { CourseReviewsSection } from '@/components/public/course-reviews-section';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { Container } from '@/components/heroui/container';

interface CourseDetailsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CourseDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: course } = await supabase
    .from('courses')
    .select('title, description, is_active')
    .eq('id', id)
    .maybeSingle();

  if (!course || !course.is_active) {
    return {};
  }

  return buildSitePageMetadata({
    title: String(course.title),
    description: String(course.description || `Detalle del curso.`),
    path: `/courses/${encodeURIComponent(id)}`,
  });
}

export default async function CourseDetailsPage({ params }: CourseDetailsPageProps) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: course } = await supabase
    .from('courses')
    .select('id, shop_id, title, description, price_cents, duration_hours, level, is_active, image_url')
    .eq('id', id)
    .maybeSingle();

  if (!course || !course.is_active) {
    notFound();
  }

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, slug, status')
    .eq('id', String(course.shop_id))
    .eq('status', 'active')
    .maybeSingle();

  if (!shop) {
    notFound();
  }

  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  const [{ data: sessions }, { data: reviews }] = await Promise.all([
    supabase
      .from('course_sessions')
      .select('id, start_at, capacity, location, status')
      .eq('course_id', id)
      .eq('status', 'scheduled')
      .order('start_at'),
    supabase
      .from('course_reviews')
      .select('id, reviewer_name, rating, comment, submitted_at')
      .eq('course_id', id)
      .eq('status', 'published')
      .order('submitted_at', { ascending: false })
      .limit(50),
  ]);

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
  const reviewList = (reviews || []).map((r) => ({
    id: String(r.id),
    reviewer_name: String(r.reviewer_name),
    rating: Number(r.rating),
    comment: r.comment ? String(r.comment) : null,
    submitted_at: String(r.submitted_at),
  }));

  const imageUrl = typeof course.image_url === 'string' && course.image_url ? course.image_url : null;
  const durationHours = Number(course.duration_hours || 0);

  return (
    <section className="space-y-10">
      {/* ── Hero ─────────────────────────────────── */}
      <Container variant="hero" className="soft-panel overflow-hidden p-0">
        {imageUrl ? (
          <div className="relative h-48 w-full md:h-64">
            <img
              src={imageUrl}
              alt={String(course.title)}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent" />
          </div>
        ) : null}

        <div className={`relative z-10 flex flex-col gap-6 px-6 py-8 md:px-10 md:py-10 lg:flex-row lg:items-end lg:justify-between ${imageUrl ? '-mt-20' : ''}`}>
          <div className="max-w-2xl">
            <p className="hero-eyebrow">Curso · {shop.name}</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold leading-tight text-ink dark:text-slate-100 md:text-[2.75rem]">
              {String(course.title)}
            </h1>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap gap-2.5 lg:justify-end lg:pb-1">
            <div className="flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 dark:border-violet-500/30 dark:bg-violet-500/10">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300">
                Precio
              </span>
              <span className="text-xl font-bold text-violet-700 dark:text-violet-200">
                {formatCurrency(Number(course.price_cents || 0))}
              </span>
            </div>
            {course.level ? (
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-600/40 dark:bg-zinc-800/50">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Nivel
                </span>
                <span className="text-sm font-semibold capitalize text-ink dark:text-slate-100">
                  {String(course.level)}
                </span>
              </div>
            ) : null}
            {durationHours > 0 ? (
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-600/40 dark:bg-zinc-800/50">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Duración
                </span>
                <span className="text-sm font-semibold text-ink dark:text-slate-100">
                  {durationHours}h
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </Container>

      {/* ── Main content: two-column on desktop ── */}
      <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">

        {/* Left: Description + Sessions */}
        <div className="space-y-8">

          {/* Description */}
          {course.description ? (
            <div className="space-y-3">
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-ink dark:text-slate-100">
                Sobre el curso
              </h2>
              <div className="soft-panel rounded-2xl p-5 md:p-7">
                <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                  {String(course.description)}
                </p>
              </div>
            </div>
          ) : null}

          {/* Sessions */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-ink dark:text-slate-100">
                Próximas sesiones
              </h2>
              {sessionList.length > 0 ? (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {sessionList.length}
                </span>
              ) : null}
            </div>

            {sessionList.length === 0 ? (
              <div className="surface-card flex flex-col items-center justify-center gap-3 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-zinc-400 dark:text-zinc-500"
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
                <p className="font-medium text-ink dark:text-slate-200">Sin sesiones programadas</p>
                <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
                  No hay sesiones disponibles por ahora. Volvé a consultar pronto.
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
                  className="soft-panel rounded-[1.8rem] p-6 md:p-8"
                >
                  {/* Date / location */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                      Sesión programada
                    </p>
                    <p className="font-[family-name:var(--font-heading)] text-2xl font-bold capitalize text-ink dark:text-slate-100 md:text-3xl">
                      {dateLabel}
                    </p>
                    <p className="text-lg font-semibold text-violet-600 dark:text-violet-400">
                      {timeLabel}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        <span>{String(session.location)}</span>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${seatsPillClass}`}>
                        {seatsLabel}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="my-6 border-t border-zinc-200 dark:border-zinc-700/50" />

                  {/* Enrollment form */}
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
        </div>

        {/* Right: Reviews (sticky on desktop) */}
        <div className="lg:sticky lg:top-24">
          <CourseReviewsSection courseId={id} reviews={reviewList} />
        </div>
      </div>
    </section>
  );
}
