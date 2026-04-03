import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { CourseDetailView } from '@/components/public/course-detail-view';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { buildTenantPublicHref } from '@/lib/shop-links';

interface CourseDetailsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CourseDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const routeContext = await getPublicTenantRouteContext();

  const { data: course } = await supabase
    .from('courses')
    .select('id, shop_id, title, description, is_active')
    .eq('id', id)
    .maybeSingle();

  if (!course || !course.is_active) {
    return {};
  }

  if (routeContext.mode !== 'path') {
    const { data: shop } = await supabase
      .from('shops')
      .select('name, slug, status')
      .eq('id', String(course.shop_id))
      .eq('status', 'active')
      .maybeSingle();

    if (!shop || routeContext.shopSlug !== String(shop.slug)) {
      return {};
    }

    return buildTenantPageMetadata({
      shop: {
        slug: String(shop.slug),
        status: String(shop.status),
      },
      title: String(course.title),
      description: String(course.description || 'Detalle del curso.'),
      section: 'courses',
      courseId: id,
    });
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
  const routeContext = await getPublicTenantRouteContext();

  const { data: course } = await supabase
    .from('courses')
    .select(
      'id, shop_id, title, description, price_cents, duration_hours, level, is_active, image_url',
    )
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

  if (routeContext.mode !== 'path' && routeContext.shopSlug !== String(shop.slug)) {
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

  const reviewList = (reviews || []).map((r) => ({
    id: String(r.id),
    reviewer_name: String(r.reviewer_name),
    rating: Number(r.rating),
    comment: r.comment ? String(r.comment) : null,
    submitted_at: String(r.submitted_at),
  }));

  const imageUrl =
    typeof course.image_url === 'string' && course.image_url ? course.image_url : null;
  const durationHours = Number(course.duration_hours || 0);
  const academyHref = buildTenantPublicHref(shop.slug, routeContext.mode, 'courses');

  const LEVEL_LABELS: Record<string, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  };
  const levelKey = (course.level || '').toString().toLowerCase();
  const levelLabel = LEVEL_LABELS[levelKey] ?? String(course.level || 'N/A');
  const priceLabel = formatCurrency(Number(course.price_cents || 0));

  // Build serializable session data
  const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const sessionData = (sessions || []).map((session) => {
    const used = enrollmentCount.get(String(session.id)) || 0;
    const capacity = Number(session.capacity || 0);
    const seatsLeft = Math.max(0, capacity - used);
    const startDate = new Date(String(session.start_at));
    const endDate = new Date(startDate.getTime() + durationHours * 3600 * 1000);
    const startMonth = monthNames[startDate.getMonth()];
    const endMonth = monthNames[endDate.getMonth()];

    return {
      id: String(session.id),
      dateLabel: `${startMonth} ${String(startDate.getDate()).padStart(2, '0')} - ${endMonth} ${String(endDate.getDate()).padStart(2, '0')}`,
      fullDateLabel: `${startMonth} ${startDate.getDate()} — ${endMonth} ${endDate.getDate()}`,
      seatsLeft,
      location: String(session.location || 'Presencial'),
    };
  });

  return (
    <CourseDetailView
      courseTitle={String(course.title)}
      courseDescription={String(course.description || 'Master the art of modern barbering.')}
      priceLabel={priceLabel}
      levelLabel={levelLabel}
      durationHours={durationHours}
      imageUrl={imageUrl}
      shopName={String(shop.name)}
      academyHref={academyHref}
      sessions={sessionData}
      reviews={reviewList}
      initialName={initialName}
      initialPhone={initialPhone}
      initialEmail={initialEmail}
      preferredPaymentMethod={preferredPaymentMethod}
    />
  );
}
