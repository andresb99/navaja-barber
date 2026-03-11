import { Card, CardBody } from '@heroui/card';
import { reviewStaffTimeOffRequestAction } from '@/app/admin/actions';
import { Container } from '@/components/heroui/container';

interface PendingTimeOffItem {
  id: string;
  staffName: string;
  startAt: string;
  endAt: string;
  reason: string;
}

interface MembershipNotificationItem {
  id: string;
  profileName: string;
}

interface AdminHomeInboxProps {
  shopId: string;
  stalePendingIntents: number;
  pendingTimeOffRequests: PendingTimeOffItem[];
  pendingMembershipNotifications: MembershipNotificationItem[];
}

export function AdminHomeInbox({
  shopId,
  stalePendingIntents,
  pendingTimeOffRequests,
  pendingMembershipNotifications,
}: AdminHomeInboxProps) {
  const urgentItemsCount =
    pendingTimeOffRequests.length + pendingMembershipNotifications.length + stalePendingIntents;

  return (
    <Container
      as={Card}
      variant="section"
      id="notificaciones"
      className="rounded-[1.9rem] scroll-mt-28"
      shadow="none"
    >
      <CardBody className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Atiende ahora
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
              Solo pendientes accionables
            </h2>
            <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
              La home deja afuera la actividad secundaria y se queda con lo que realmente requiere
              una decision rapida.
            </p>
          </div>
          <span className="meta-chip" data-tone={urgentItemsCount > 0 ? 'warning' : 'success'}>
            {urgentItemsCount ? `${urgentItemsCount} pendientes` : 'Todo al dia'}
          </span>
        </div>

        {urgentItemsCount === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-50">
            No hay acciones urgentes en este momento. Puedes entrar directo a citas, staff, metricas
            o configuracion sin revisar una home cargada de ruido.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {stalePendingIntents > 0 ? (
              <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                Hay {stalePendingIntents} pagos pendientes por mas de 30 minutos. Conviene revisar
                checkout e intents antes de seguir.
              </div>
            ) : null}

            {pendingTimeOffRequests.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.03]"
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
                    <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">{item.reason}</p>
                  </div>
                  <span className="meta-chip" data-tone="warning">
                    Pendiente
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <form action={reviewStaffTimeOffRequestAction}>
                    <input type="hidden" name="shop_id" value={shopId} />
                    <input type="hidden" name="time_off_id" value={item.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button
                      type="submit"
                      className="action-primary inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
                    >
                      Aprobar ausencia
                    </button>
                  </form>
                  <form action={reviewStaffTimeOffRequestAction}>
                    <input type="hidden" name="shop_id" value={shopId} />
                    <input type="hidden" name="time_off_id" value={item.id} />
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

            {pendingMembershipNotifications.map((item) => (
              <div
                key={`pending-${item.id}`}
                className="rounded-[1.45rem] border border-white/65 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.03]"
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
                      Sigue pendiente de aceptacion.
                    </p>
                  </div>
                  <span className="meta-chip" data-tone="warning">
                    Pendiente
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Container>
  );
}
