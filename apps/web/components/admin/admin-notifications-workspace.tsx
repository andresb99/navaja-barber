import Link from 'next/link';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { BellRing, CalendarClock, CreditCard, Users } from 'lucide-react';
import { reviewStaffTimeOffRequestAction } from '@/app/admin/actions';
import {
  buildAdminNotificationTargetId,
  type AdminPendingMembershipNotification,
  type AdminPendingPaymentNotification,
  type AdminPendingTimeOffNotification,
} from '@/lib/admin-notifications';
import { Container } from '@/components/heroui/container';

interface AdminNotificationsWorkspaceProps {
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopTimezone: string;
  pendingMembershipNotifications: AdminPendingMembershipNotification[];
  pendingPaymentNotifications: AdminPendingPaymentNotification[];
  pendingTimeOffRequests: AdminPendingTimeOffNotification[];
  pendingMembershipCount: number;
  pendingTimeOffCount: number;
  stalePendingIntents: number;
  totalCount: number;
}

function formatDateTime(value: string, timeZone: string) {
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

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof BellRing;
}) {
  return (
    <article className="data-card rounded-[1.7rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-ink dark:text-slate-100">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{detail}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/70 bg-white/75 text-ink shadow-[0_18px_28px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

export function AdminNotificationsWorkspace({
  shopId,
  shopName,
  shopSlug,
  shopTimezone,
  pendingMembershipNotifications,
  pendingPaymentNotifications,
  pendingTimeOffRequests,
  pendingMembershipCount,
  pendingTimeOffCount,
  stalePendingIntents,
  totalCount,
}: AdminNotificationsWorkspaceProps) {
  const latestAlert = [
    ...pendingTimeOffRequests.map((item) => ({
      createdAt: item.createdAt,
      copy: `La alerta mas reciente entro ${formatDateTime(item.createdAt, shopTimezone)}.`,
    })),
    ...pendingMembershipNotifications.map((item) => ({
      createdAt: item.createdAt,
      copy: `La ultima invitacion quedo pendiente ${formatDateTime(item.createdAt, shopTimezone)}.`,
    })),
    ...pendingPaymentNotifications.map((item) => ({
      createdAt: item.createdAt,
      copy: `El checkout mas reciente quedo pendiente ${formatDateTime(item.createdAt, shopTimezone)}.`,
    })),
  ]
    .map((item) => ({ ...item, timestamp: new Date(item.createdAt).getTime() }))
    .filter((item) => Number.isFinite(item.timestamp))
    .sort((left, right) => right.timestamp - left.timestamp)[0];
  const latestAlertCopy = latestAlert?.copy || 'No hay nuevas alertas de equipo por ahora.';

  return (
    <section className="space-y-6">
      <Container variant="pageHeader" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Notificaciones</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Inbox operativo del local
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate/80 dark:text-slate-300">
              {shopName} concentra aca solo alertas activas. Cuando algo sale de esta lista, ya no
              requiere seguimiento.
            </p>
          </div>

          <div className="surface-card rounded-[1.8rem] p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Estado actual
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Chip
                size="sm"
                radius="full"
                variant="flat"
                color={totalCount > 0 ? 'warning' : 'success'}
              >
                {totalCount > 0 ? `${totalCount} pendientes` : 'Todo al dia'}
              </Chip>
              <Chip size="sm" radius="full" variant="flat">
                Barberia activa
              </Chip>
            </div>
            <p className="mt-4 text-sm text-slate/80 dark:text-slate-300">
              El acceso rapido vive en la campana del header; esta pagina es la vista completa para
              revisar y resolver alertas.
            </p>
          </div>
        </div>
      </Container>

      <div className="grid gap-3 lg:grid-cols-3">
        <SummaryCard
          label="Ausencias"
          value={String(pendingTimeOffCount)}
          detail="Solicitudes del equipo esperando aprobacion o rechazo."
          icon={CalendarClock}
        />
        <SummaryCard
          label="Invitaciones"
          value={String(pendingMembershipCount)}
          detail="Miembros pendientes de aceptar acceso al local."
          icon={Users}
        />
        <SummaryCard
          label="Pagos"
          value={String(stalePendingIntents)}
          detail="Checkouts con mas de 30 minutos sin resolverse."
          icon={CreditCard}
        />
      </div>

      {totalCount === 0 ? (
        <Container as={Card} variant="section" className="rounded-[1.9rem]" shadow="none">
          <CardBody className="flex flex-col items-start gap-4 p-5 md:p-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200/80 dark:text-emerald-200/70">
                Todo al dia
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                No hay alertas activas en este momento
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
                La barberia no tiene ausencias pendientes, invitaciones sin respuesta ni pagos
                estancados. Puedes volver al resumen o seguir trabajando desde citas y staff.
              </p>
            </div>
            <Link
              href={`/admin?shop=${encodeURIComponent(shopSlug)}`}
              className="action-secondary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold no-underline"
            >
              Volver al resumen
            </Link>
          </CardBody>
        </Container>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <Container as={Card} variant="section" className="rounded-[1.9rem]" shadow="none">
            <CardBody className="space-y-4 p-5 md:p-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Requieren accion
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                  Resuelve primero lo operativo
                </h2>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Este inbox prioriza lo que cambia la operacion del dia. No muestra ruido historico
                  ni eventos que ya quedaron cerrados.
                </p>
              </div>

              {pendingTimeOffRequests.map((item) => (
                <div
                  key={item.id}
                  id={buildAdminNotificationTargetId('time_off', item.id)}
                  className="scroll-mt-28 rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-slate-100">
                        Solicitud de ausencia
                      </p>
                      <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                        {item.staffName}
                      </p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        {item.startAt} a {item.endAt}
                      </p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        {item.reason}
                      </p>
                    </div>
                    <Chip size="sm" radius="full" variant="flat" color="warning">
                      Pendiente
                    </Chip>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <form action={reviewStaffTimeOffRequestAction}>
                      <input type="hidden" name="shop_id" value={shopId} />
                      <input type="hidden" name="time_off_id" value={item.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <Button
                        type="submit"
                        className="action-primary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
                      >
                        Aprobar ausencia
                      </Button>
                    </form>
                    <form action={reviewStaffTimeOffRequestAction}>
                      <input type="hidden" name="shop_id" value={shopId} />
                      <input type="hidden" name="time_off_id" value={item.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <Button
                        type="submit"
                        variant="ghost"
                        className="action-secondary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
                      >
                        Rechazar
                      </Button>
                    </form>
                  </div>
                </div>
              ))}

              {pendingMembershipNotifications.map((item) => (
                <div
                  key={item.id}
                  id={buildAdminNotificationTargetId('membership', item.id)}
                  className="scroll-mt-28 rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-slate-100">
                        Invitacion pendiente
                      </p>
                      <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                        {item.profileName}
                      </p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        Rol ofrecido: {item.role === 'admin' ? 'Administrador' : 'Staff'}
                      </p>
                    </div>
                    <Chip size="sm" radius="full" variant="flat" color="warning">
                      Sin respuesta
                    </Chip>
                  </div>
                </div>
              ))}

              {pendingPaymentNotifications.map((item) => (
                <div
                  key={item.id}
                  id={buildAdminNotificationTargetId('payment', item.id)}
                  className="scroll-mt-28 rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-slate-100">
                        {item.intentType === 'subscription'
                          ? 'Cobro de suscripcion pendiente'
                          : item.intentType === 'course_enrollment'
                            ? 'Pago de curso pendiente'
                            : 'Pago de reserva pendiente'}
                      </p>
                      <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                        {item.customerName || 'Checkout sin cliente visible'}
                      </p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        Detectado {formatDateTime(item.createdAt, shopTimezone)}
                      </p>
                    </div>
                    <Chip size="sm" radius="full" variant="flat" color="warning">
                      Seguimiento
                    </Chip>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/admin/appointments?shop=${encodeURIComponent(shopSlug)}`}
                      className="action-primary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold no-underline"
                    >
                      Abrir citas
                    </Link>
                  </div>
                </div>
              ))}
            </CardBody>
          </Container>

          <Container as={Card} variant="section" className="rounded-[1.9rem]" shadow="none">
            <CardBody className="space-y-4 p-5 md:p-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Contexto rapido
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                  Donde seguir
                </h2>
              </div>

              {stalePendingIntents > 0 ? (
                <div className="rounded-[1.45rem] border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-50">Pagos pendientes</p>
                  <p className="mt-2 text-sm text-amber-50/80">
                    Hay {stalePendingIntents} checkouts que conviene revisar antes de que el cliente
                    abandone la reserva.
                  </p>
                  <Link
                    href={`/admin/appointments?shop=${encodeURIComponent(shopSlug)}`}
                    className="mt-4 inline-flex text-sm font-semibold text-amber-50 underline underline-offset-2"
                  >
                    Ir a citas
                  </Link>
                </div>
              ) : (
                <div className="rounded-[1.45rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-sm font-semibold text-emerald-50">Pagos bajo control</p>
                  <p className="mt-2 text-sm text-emerald-50/80">
                    No hay intents pendientes por fuera del umbral de seguimiento.
                  </p>
                </div>
              )}

              <div className="rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-sm font-semibold text-ink dark:text-slate-100">Equipo</p>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Las invitaciones viven aca hasta que la persona acepte o rechace, y luego pasan
                  automaticamente al flujo normal de staff.
                </p>
                <Link
                  href={`/admin/staff?shop=${encodeURIComponent(shopSlug)}`}
                  className="mt-4 inline-flex text-sm font-semibold text-ink underline underline-offset-2 dark:text-slate-100"
                >
                  Abrir staff
                </Link>
              </div>

              <div className="rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                  Ultima actividad
                </p>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{latestAlertCopy}</p>
              </div>
            </CardBody>
          </Container>
        </div>
      )}
    </section>
  );
}
