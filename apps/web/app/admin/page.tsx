import { formatCurrency } from '@navaja/shared';
import { AdminHomeSummary } from '@/components/admin/admin-home-summary';
import { AdminNotificationsDigest } from '@/components/admin/admin-notifications-digest';
import { getAdminNotificationsData } from '@/lib/admin-notifications';
import { requireAdmin } from '@/lib/auth';
import { getDashboardMetrics } from '@/lib/metrics';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface AdminHomePageProps {
  searchParams: Promise<{ shop?: string }>;
}

interface SummaryAppointmentRow {
  id: string | null;
  start_at: string | null;
  customers: { name?: string | null } | null;
  services: { name?: string | null } | null;
  staff: { name?: string | null } | null;
}

interface SummaryReviewRow {
  id: string | null;
  rating: number | null;
  comment: string | null;
  submitted_at: string | null;
  customers: { name?: string | null } | null;
}

function formatAdminShortDateTime(value: string, timeZone: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-UY', {
    timeZone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function formatAdminShortDate(value: string, timeZone: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-UY', {
    timeZone,
    day: 'numeric',
    month: 'short',
  }).format(parsed);
}

function pickRelationName(value: { name?: string | null } | null, fallback: string) {
  const normalized = String(value?.name || '').trim();
  return normalized || fallback;
}

function trimCopy(value: string | null | undefined, maxLength = 84) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

export default async function AdminHomePage({ searchParams }: AdminHomePageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const [metrics, notifications] = await Promise.all([
    getDashboardMetrics('today', ctx.shopId),
    getAdminNotificationsData(ctx.shopId),
  ]);
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const [nextAppointmentResult, lastCompletedAppointmentResult, latestReviewResult] =
    await Promise.all([
    supabase
      .from('appointments')
      .select('id, start_at, customers(name), services(name), staff(name)')
      .eq('shop_id', ctx.shopId)
      .in('status', ['pending', 'confirmed'])
      .gte('start_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(1),
    supabase
      .from('appointments')
      .select('id, start_at, customers(name), services(name), staff(name)')
      .eq('shop_id', ctx.shopId)
      .eq('status', 'done')
      .order('start_at', { ascending: false })
      .limit(1),
    supabase
      .from('appointment_reviews')
      .select('id, rating, comment, submitted_at, customers(name)')
      .eq('shop_id', ctx.shopId)
      .eq('status', 'published')
      .order('submitted_at', { ascending: false })
      .limit(1),
    ]);

  const activeAppointments =
    metrics.statusSummary.pendingAppointments + metrics.statusSummary.confirmedAppointments;
  const urgentItemsCount = notifications.totalCount;
  const nextAppointment =
    (((nextAppointmentResult.error ? [] : nextAppointmentResult.data) || [])[0] as
      | SummaryAppointmentRow
      | undefined) || null;
  const lastCompletedAppointment =
    (((lastCompletedAppointmentResult.error ? [] : lastCompletedAppointmentResult.data) || [])[0] as
      | SummaryAppointmentRow
      | undefined) || null;
  const latestReview =
    (((latestReviewResult.error ? [] : latestReviewResult.data) || [])[0] as
      | SummaryReviewRow
      | undefined) || null;
  const nextAppointmentService = pickRelationName(nextAppointment?.services || null, 'Servicio sin nombre');
  const nextAppointmentStaff = pickRelationName(nextAppointment?.staff || null, 'Staff');
  const nextAppointmentCustomer = pickRelationName(nextAppointment?.customers || null, 'Cliente');
  const completedAppointmentService = pickRelationName(
    lastCompletedAppointment?.services || null,
    'Servicio sin nombre',
  );
  const completedAppointmentStaff = pickRelationName(lastCompletedAppointment?.staff || null, 'Staff');
  const completedAppointmentCustomer = pickRelationName(
    lastCompletedAppointment?.customers || null,
    'Cliente',
  );
  const latestReviewCustomer = pickRelationName(latestReview?.customers || null, 'Cliente');
  const latestReviewComment = trimCopy(latestReview?.comment);
  const latestReviewRating =
    typeof latestReview?.rating === 'number' && Number.isFinite(latestReview.rating)
      ? latestReview.rating.toFixed(1)
      : null;

  return (
    <section className="space-y-6">
      <AdminHomeSummary
        shopName={ctx.shopName}
        rangeLabel={metrics.rangeLabel}
        revenueLabel={formatCurrency(metrics.estimatedRevenueCents)}
        activeAppointments={activeAppointments}
        urgentItemsCount={urgentItemsCount}
        summaryCards={[
          {
            id: 'next-appointment',
            icon: 'next',
            label: 'Proxima cita',
            headline: nextAppointment?.start_at
              ? formatAdminShortDateTime(nextAppointment.start_at, ctx.shopTimezone)
              : 'Sin citas proximas',
            detail: nextAppointment?.id
              ? `${nextAppointmentCustomer} con ${nextAppointmentStaff}`
              : 'No hay reservas pendientes o confirmadas despues de ahora.',
            meta: nextAppointment?.id ? nextAppointmentService : 'Agenda libre',
          },
          {
            id: 'last-completed-appointment',
            icon: 'completed',
            label: 'Ultima cita realizada',
            headline: lastCompletedAppointment?.id
              ? completedAppointmentCustomer
              : 'Sin citas realizadas',
            detail: lastCompletedAppointment?.id
              ? `${completedAppointmentService} con ${completedAppointmentStaff}`
              : 'Todavia no hay citas marcadas como realizadas para resumir aca.',
            meta: lastCompletedAppointment?.start_at
              ? `Atendida ${formatAdminShortDateTime(lastCompletedAppointment.start_at, ctx.shopTimezone)}`
              : 'Sin historial reciente',
          },
          {
            id: 'latest-review',
            icon: 'review',
            label: 'Ultima resena',
            headline: latestReviewRating ? `${latestReviewRating} / 5` : 'Sin resenas publicadas',
            detail: latestReview?.id
              ? `${latestReviewCustomer} dejo feedback reciente.`
              : 'Todavia no hay feedback publicado para mostrar en la home.',
            meta: latestReview?.submitted_at
              ? latestReviewComment || `Publicada ${formatAdminShortDate(latestReview.submitted_at, ctx.shopTimezone)}`
              : 'Calidad de servicio',
          },
        ]}
      />

      <AdminNotificationsDigest
        shopSlug={ctx.shopSlug}
        totalCount={notifications.totalCount}
        pendingTimeOffCount={notifications.pendingTimeOffCount}
        pendingMembershipCount={notifications.pendingMembershipCount}
        stalePendingIntents={notifications.stalePendingIntents}
      />
    </section>
  );
}
