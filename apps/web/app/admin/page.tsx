import { formatCurrency } from '@navaja/shared';
import Link from 'next/link';
import { Card, CardBody } from '@heroui/card';
import { reviewStaffTimeOffRequestAction } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';
import { getDashboardMetrics } from '@/lib/metrics';
import { getProductFunnelSnapshot } from '@/lib/product-analytics';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPendingTimeOffReason, stripPendingTimeOffReason } from '@/lib/time-off-requests';
import { buildAdminHref } from '@/lib/workspace-routes';

interface AdminHomePageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function AdminHomePage({ searchParams }: AdminHomePageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const [metrics, funnel] = await Promise.all([
    getDashboardMetrics('today', ctx.shopId),
    getProductFunnelSnapshot({ shopId: ctx.shopId, sinceDays: 30, stalePendingMinutes: 30 }),
  ]);
  const supabase = await createSupabaseServerClient();
  const recentCancellationSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: memberships }, { data: cancelledAppointments }, { data: timeOffRows }] =
    await Promise.all([
      supabase
        .from('shop_memberships')
        .select('id, user_id, role, membership_status, created_at, updated_at')
        .eq('shop_id', ctx.shopId)
        .in('role', ['admin', 'staff'])
        .neq('membership_status', 'disabled')
        .order('updated_at', { ascending: false })
        .limit(12),
      supabase
        .from('appointments')
        .select('id, start_at, cancelled_by, customers(name), staff(name), services(name)')
        .eq('shop_id', ctx.shopId)
        .eq('status', 'cancelled')
        .gte('start_at', recentCancellationSince)
        .order('start_at', { ascending: false })
        .limit(8),
      supabase
        .from('time_off')
        .select('id, staff_id, start_at, end_at, reason, created_at, staff(name)')
        .eq('shop_id', ctx.shopId)
        .order('created_at', { ascending: false })
        .limit(12),
    ]);
  const membershipUserIds = Array.from(
    new Set((memberships || []).map((item) => String(item.user_id || '')).filter(Boolean)),
  );
  const { data: membershipProfiles } = membershipUserIds.length
    ? await supabase
        .from('user_profiles')
        .select('auth_user_id, full_name')
        .in('auth_user_id', membershipUserIds)
    : { data: [] as Array<{ auth_user_id: string; full_name: string | null }> };
  const profileNamesById = new Map(
    (membershipProfiles || []).map((item) => [
      String(item.auth_user_id),
      (typeof item.full_name === 'string' && item.full_name.trim()) || null,
    ]),
  );
  const acceptedMembershipNotifications = (memberships || []).filter((item) => {
    const membershipStatus = String(item.membership_status || '');
    return membershipStatus === 'active' && String(item.updated_at || '') !== String(item.created_at || '');
  });
  const pendingMembershipNotifications = (memberships || []).filter(
    (item) => String(item.membership_status || '') === 'invited',
  );
  const pendingTimeOffRequests = (timeOffRows || []).filter((item) =>
    isPendingTimeOffReason(item.reason as string | null),
  );
  const notificationCount =
    acceptedMembershipNotifications.length +
    pendingMembershipNotifications.length +
    (cancelledAppointments || []).length +
    pendingTimeOffRequests.length;

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Panel admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Resumen administrativo
            </h1>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              Resumen de hoy de {ctx.shopName} con una lectura mas clara y menos cajas pesadas.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Facturacion
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {formatCurrency(metrics.estimatedRevenueCents)}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Ticket
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {formatCurrency(metrics.averageTicketCents)}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Ocupacion
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {Math.round(metrics.occupancyRatio * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="data-card rounded-[1.7rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
              Facturacion (realizado)
            </h3>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(metrics.estimatedRevenueCents)}
            </p>
          </CardBody>
        </Card>
        <Card className="data-card rounded-[1.7rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Ticket promedio</h3>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(metrics.averageTicketCents)}
            </p>
          </CardBody>
        </Card>
        <Card className="data-card rounded-[1.7rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Ocupacion</h3>
            <p className="mt-2 text-2xl font-semibold">
              {Math.round(metrics.occupancyRatio * 100)}%
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href={buildAdminHref('/admin/appointments', ctx.shopSlug)}
          className="data-card rounded-2xl border-0 p-5 no-underline"
        >
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">
            Gestionar citas
          </h2>
          <p className="mt-1 text-sm text-slate/80">
            Filtra y actualiza estados de reservas de hoy y proximas.
          </p>
        </Link>
        <Link
          href={buildAdminHref('/admin/metrics', ctx.shopSlug)}
          className="data-card rounded-2xl border-0 p-5 no-underline"
        >
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">
            Metricas detalladas
          </h2>
          <p className="mt-1 text-sm text-slate/80">
            Facturacion, servicios top, desempeno por barbero y ocupacion.
          </p>
        </Link>
      </div>

      <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink dark:text-slate-100">
                Funnel de reservas y pagos
              </h2>
              <p className="text-sm text-slate/80 dark:text-slate-300">
                Ultimos 30 dias de eventos instrumentados y alertas de cobros pendientes.
              </p>
            </div>
            <span className="meta-chip" data-tone={funnel.stalePendingIntents > 0 ? 'warning' : 'success'}>
              {funnel.stalePendingIntents} pendientes viejos
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="surface-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Booking iniciado
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {funnel.counts['booking.submitted'] || 0}
              </p>
            </div>
            <div className="surface-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Checkout creado
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {funnel.counts['booking.payment_checkout_created'] || 0}
              </p>
            </div>
            <div className="surface-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Intent procesado
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {funnel.counts['payment.intent_processed'] || 0}
              </p>
            </div>
            <div className="surface-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Refunds
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {funnel.refundedIntents}
              </p>
            </div>
            <div className="surface-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Revision manual
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {funnel.counts['payment.intent_manual_refund_required'] || 0}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card
        id="notificaciones"
        className="spotlight-card soft-panel rounded-[1.9rem] border-0 shadow-none scroll-mt-28"
      >
        <CardBody className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink dark:text-slate-100">
                Notificaciones
              </h2>
              <p className="text-sm text-slate/80 dark:text-slate-300">
                Alertas utiles para el admin: invitaciones del equipo, cancelaciones y solicitudes
                de ausencia.
              </p>
            </div>
            <span className="meta-chip" data-tone={notificationCount > 0 ? 'warning' : undefined}>
              {notificationCount} items
            </span>
          </div>

          {notificationCount === 0 ? (
            <p className="text-sm text-slate/70 dark:text-slate-400">
              No hay novedades administrativas en este momento.
            </p>
          ) : null}

          <div className="grid gap-3">
            {pendingTimeOffRequests.map((item) => (
              <div key={String(item.id)} className="data-card rounded-[1.5rem] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink dark:text-slate-100">
                      Solicitud de ausencia
                    </p>
                    <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                      {String((item.staff as { name?: string } | null)?.name || 'Personal')}
                    </p>
                    <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                      {new Date(String(item.start_at)).toLocaleString('es-UY')} a{' '}
                      {new Date(String(item.end_at)).toLocaleString('es-UY')}
                    </p>
                    <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                      {stripPendingTimeOffReason(item.reason as string | null) || 'Sin motivo'}
                    </p>
                  </div>
                  <span className="meta-chip" data-tone="warning">
                    Pendiente
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <form action={reviewStaffTimeOffRequestAction}>
                    <input type="hidden" name="shop_id" value={ctx.shopId} />
                    <input type="hidden" name="time_off_id" value={String(item.id)} />
                    <input type="hidden" name="decision" value="approve" />
                    <button
                      type="submit"
                      className="action-primary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
                    >
                      Aprobar ausencia
                    </button>
                  </form>
                  <form action={reviewStaffTimeOffRequestAction}>
                    <input type="hidden" name="shop_id" value={ctx.shopId} />
                    <input type="hidden" name="time_off_id" value={String(item.id)} />
                    <input type="hidden" name="decision" value="reject" />
                    <button
                      type="submit"
                      className="action-secondary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
                    >
                      Rechazar
                    </button>
                  </form>
                </div>
              </div>
            ))}

            {acceptedMembershipNotifications.map((item) => {
              const profileName =
                profileNamesById.get(String(item.user_id || '')) ||
                `Usuario ${String(item.user_id || '').slice(0, 8)}`;

              return (
                <div key={`accepted-${String(item.id)}`} className="data-card rounded-[1.5rem] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-ink dark:text-slate-100">
                        Invitacion aceptada
                      </p>
                      <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">{profileName}</p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        Ya puede entrar a Mis barberias y al panel de staff.
                      </p>
                    </div>
                    <span className="meta-chip" data-tone="success">
                      Success
                    </span>
                  </div>
                </div>
              );
            })}

            {pendingMembershipNotifications.map((item) => {
              const profileName =
                profileNamesById.get(String(item.user_id || '')) ||
                `Usuario ${String(item.user_id || '').slice(0, 8)}`;

              return (
                <div key={`pending-${String(item.id)}`} className="data-card rounded-[1.5rem] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-ink dark:text-slate-100">
                        Invitacion enviada
                      </p>
                      <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">{profileName}</p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        Sigue pendiente de aceptacion.
                      </p>
                    </div>
                    <span className="meta-chip" data-tone="warning">
                      Pending
                    </span>
                  </div>
                </div>
              );
            })}

            {(cancelledAppointments || []).map((item) => (
              <div key={`cancelled-${String(item.id)}`} className="data-card rounded-[1.5rem] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink dark:text-slate-100">
                      Cita cancelada
                    </p>
                    <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                      {String((item.customers as { name?: string } | null)?.name || 'Cliente')} con{' '}
                      {String((item.staff as { name?: string } | null)?.name || 'Personal')}
                    </p>
                    <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                      {new Date(String(item.start_at)).toLocaleString('es-UY')} -{' '}
                      {String((item.services as { name?: string } | null)?.name || 'Servicio')}
                    </p>
                  </div>
                  <span className="meta-chip" data-tone="danger">
                    {String(item.cancelled_by || 'system')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
