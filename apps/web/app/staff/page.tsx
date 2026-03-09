import { formatCurrency } from '@navaja/shared';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { createManualAppointmentAction, createStaffTimeOffRequestAction } from '@/app/admin/actions';
import { requireStaff } from '@/lib/auth';
import { getStaffPerformanceDetail } from '@/lib/metrics';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPendingTimeOffReason, stripPendingTimeOffReason } from '@/lib/time-off-requests';

const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const statusTone: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  confirmed: 'default',
  cancelled: 'danger',
  no_show: 'danger',
  done: 'success',
};

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistio',
  done: 'Realizada',
};

const paymentStatusTone: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  processing: 'warning',
  approved: 'success',
  refunded: 'default',
  rejected: 'danger',
  cancelled: 'danger',
  expired: 'danger',
};

const paymentStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  approved: 'Aprobado',
  refunded: 'Devuelto',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

interface PaymentIntentStatusItem {
  id: string | null;
  status: string | null;
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} h`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return 'ST';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

interface StaffPageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const params = await searchParams;
  const ctx = await requireStaff({ shopSlug: params.shop });
  const supabase = await createSupabaseServerClient();

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  const [appointmentsResult, workingHoursResult, timeOffResult, coursesResult, staffResult, servicesResult, performance] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('id, start_at, end_at, status, payment_intent_id, services(name), customers(name, phone), notes')
        .eq('staff_id', ctx.staffId)
        .gte('start_at', start.toISOString())
        .lt('start_at', end.toISOString())
        .order('start_at'),
      supabase
        .from('working_hours')
        .select('id, staff_id, day_of_week, start_time, end_time, staff(name)')
        .eq('shop_id', ctx.shopId)
        .order('day_of_week'),
      supabase
        .from('time_off')
        .select('id, staff_id, start_at, end_at, reason, created_at, staff(name)')
        .eq('shop_id', ctx.shopId)
        .order('start_at', { ascending: false })
        .limit(20),
      supabase
        .from('courses')
        .select('id, title, level, duration_hours, price_cents')
        .eq('shop_id', ctx.shopId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('staff')
        .select('id, name')
        .eq('shop_id', ctx.shopId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('services')
        .select('id, name')
        .eq('shop_id', ctx.shopId)
        .eq('is_active', true)
        .order('name'),
      getStaffPerformanceDetail(
        ctx.staffId,
        {
          range: 'last7',
        },
        ctx.shopId,
      ).catch(() => null),
    ]);

  const appointments = appointmentsResult.data || [];
  const paymentIntentIds = Array.from(
    new Set(
      appointments
        .map((item) => String((item as { payment_intent_id?: string | null }).payment_intent_id || '').trim())
        .filter(Boolean),
    ),
  );
  const paymentStatusByIntentId = new Map<string, string>();

  if (paymentIntentIds.length) {
    const { data: paymentIntents } = await supabase
      .from('payment_intents')
      .select('id, status')
      .in('id', paymentIntentIds);

    (paymentIntents || []).forEach((item) => {
      const row = item as PaymentIntentStatusItem;
      const intentId = String(row.id || '').trim();
      const status = String(row.status || '').trim().toLowerCase();
      if (intentId && status) {
        paymentStatusByIntentId.set(intentId, status);
      }
    });
  }

  const timeOffRows = timeOffResult.data || [];
  const staffOptions = staffResult.data || [];
  const serviceOptions = servicesResult.data || [];
  const hasManualBookingOptions = Boolean(staffOptions.length && serviceOptions.length);
  const defaultManualStartAt = new Date().toISOString().slice(0, 16);
  const groupedWorkingHours = new Map<
    string,
    Array<{
      id: string;
      dayLabel: string;
      startTime: string;
      endTime: string;
    }>
  >();

  for (const entry of workingHoursResult.data || []) {
    const staffName = String((entry.staff as { name?: string } | null)?.name || 'Personal');

    if (!groupedWorkingHours.has(staffName)) {
      groupedWorkingHours.set(staffName, []);
    }

    groupedWorkingHours.get(staffName)?.push({
      id: String(entry.id),
      dayLabel: weekdays[Number(entry.day_of_week || 0)] || 'Dia',
      startTime: String(entry.start_time),
      endTime: String(entry.end_time),
    });
  }

  const myPendingTimeOff = timeOffRows.filter(
    (item) =>
      String(item.staff_id || '') === ctx.staffId && isPendingTimeOffReason(item.reason as string | null),
  );
  const myApprovedTimeOff = timeOffRows.filter(
    (item) =>
      String(item.staff_id || '') === ctx.staffId && !isPendingTimeOffReason(item.reason as string | null),
  );

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-8">
        <div className="relative z-10">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.1rem] dark:text-slate-100">
            Panel de staff
          </h1>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
            Vista operativa de {ctx.shopName} para {ctx.email || 'tu cuenta'}: tus reservas,
            metricas propias, horarios del equipo y solicitudes de ausencia.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="data-card rounded-[1.7rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Proximas citas
            </h3>
            <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
              {appointments.length}
            </p>
          </CardBody>
        </Card>
        <Card className="data-card rounded-[1.7rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Ausencias pendientes
            </h3>
            <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
              {myPendingTimeOff.length}
            </p>
          </CardBody>
        </Card>
        <Card className="data-card rounded-[1.7rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Resena promedio
            </h3>
            <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
              {performance ? performance.metric.trustedRating.toFixed(1) : '0.0'}
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="space-y-4 p-5">
            <div>
              <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Mis metricas</h3>
              <p className="text-sm text-slate/80 dark:text-slate-300">
                Solo lectura. Ves tu rendimiento personal sin acceso a la gestion global del equipo.
              </p>
            </div>

            {performance ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="data-card rounded-2xl p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                    Facturacion
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {formatCurrency(performance.metric.totalRevenueCents)}
                  </p>
                </div>
                <div className="data-card rounded-2xl p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                    Realizadas
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {performance.metric.completedAppointments}
                  </p>
                </div>
                <div className="data-card rounded-2xl p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                    Ocupacion
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {Math.round(performance.metric.occupancyRatio * 100)}%
                  </p>
                </div>
                <div className="data-card rounded-2xl p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                    Horas reservadas
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {formatHours(performance.metric.bookedMinutes)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate/70 dark:text-slate-400">
                Aun no hay suficientes datos para mostrar tus metricas.
              </p>
            )}
          </CardBody>
        </Card>

        <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="space-y-4 p-5">
            <div>
              <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
                Solicitar ausencia
              </h3>
              <p className="text-sm text-slate/80 dark:text-slate-300">
                Tu solicitud entra como pendiente y el admin la aprueba o la rechaza desde sus
                notificaciones.
              </p>
            </div>

            <form action={createStaffTimeOffRequestAction} className="grid gap-3">
              <input type="hidden" name="shop_id" value={ctx.shopId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  id="staff-time-off-start-at"
                  name="start_at"
                  type="datetime-local"
                  required
                  className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                />
                <input
                  id="staff-time-off-end-at"
                  name="end_at"
                  type="datetime-local"
                  required
                  className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
                />
              </div>
              <input
                name="reason"
                type="text"
                placeholder="Motivo de la ausencia"
                className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
              />
              <button
                type="submit"
                className="action-primary inline-flex w-fit rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                Enviar solicitud
              </button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
            Registrar cliente presencial
          </h3>
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Crea reservas manuales y registralas en la misma agenda del sistema.
          </p>

          {!hasManualBookingOptions ? (
            <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Necesitas al menos un barbero activo y un servicio activo para registrar reservas.
            </p>
          ) : null}

          <form action={createManualAppointmentAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input type="hidden" name="shop_id" value={ctx.shopId} />

            <select
              name="source_channel"
              required
              defaultValue="WALK_IN"
              disabled={!hasManualBookingOptions}
              className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            >
              <option value="WALK_IN">Presencial</option>
              <option value="ADMIN_CREATED">Carga manual</option>
            </select>

            <select
              name="service_id"
              required
              defaultValue=""
              disabled={!hasManualBookingOptions}
              className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            >
              <option value="" disabled>
                Servicio
              </option>
              {serviceOptions.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  {String(item.name)}
                </option>
              ))}
            </select>

            <select
              name="staff_id"
              required
              defaultValue={ctx.staffId}
              disabled={!hasManualBookingOptions}
              className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            >
              {staffOptions.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  {String(item.name)}
                </option>
              ))}
            </select>

            <input
              name="start_at"
              type="datetime-local"
              required
              defaultValue={defaultManualStartAt}
              disabled={!hasManualBookingOptions}
              className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            />
            <input
              name="customer_name"
              type="text"
              required
              placeholder="Nombre del cliente"
              disabled={!hasManualBookingOptions}
              className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            />
            <input
              name="customer_phone"
              type="tel"
              required
              placeholder="Telefono"
              disabled={!hasManualBookingOptions}
              className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            />
            <input
              name="customer_email"
              type="email"
              placeholder="Email (opcional)"
              disabled={!hasManualBookingOptions}
              className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
            />
            <input
              name="notes"
              type="text"
              placeholder="Notas (opcional)"
              disabled={!hasManualBookingOptions}
              className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 xl:col-span-2"
            />

            <div className="md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                disabled={!hasManualBookingOptions}
                className="action-primary inline-flex w-fit rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Guardar reserva manual
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Mis citas</h3>
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Vista de tus proximos 7 dias. Desde aqui no editas estados ni equipo.
          </p>

          <div className="mt-4 space-y-3">
            {appointments.length === 0 ? (
              <p className="text-sm text-slate/70">No hay citas en este periodo.</p>
            ) : null}

            {appointments.map((item) => {
              const paymentStatus = paymentStatusByIntentId.get(
                String((item as { payment_intent_id?: string | null }).payment_intent_id || '').trim(),
              ) || null;
              const normalizedPaymentStatus = String(paymentStatus || '').trim().toLowerCase();
              const paymentLabel = normalizedPaymentStatus
                ? paymentStatusLabel[normalizedPaymentStatus] || normalizedPaymentStatus
                : 'Sin pago online';
              const paymentTone = normalizedPaymentStatus
                ? paymentStatusTone[normalizedPaymentStatus] || 'default'
                : 'default';

              return (
                <div key={String(item.id)} className="surface-card rounded-2xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-ink dark:text-slate-100">
                      {new Date(String(item.start_at)).toLocaleString('es-UY')} -{' '}
                      {String((item.services as { name?: string } | null)?.name || 'Servicio')}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip
                        size="sm"
                        radius="full"
                        variant="flat"
                        color={statusTone[String(item.status)] || 'default'}
                      >
                        {statusLabel[String(item.status)] || String(item.status)}
                      </Chip>
                      <Chip size="sm" radius="full" variant="flat" color={paymentTone}>
                        Pago: {paymentLabel}
                      </Chip>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate/70">
                    Cliente:{' '}
                    {String((item.customers as { name?: string } | null)?.name || 'Sin nombre')} -{' '}
                    {String((item.customers as { phone?: string } | null)?.phone || 'Sin telefono')}
                  </p>
                  {item.notes ? (
                    <p className="mt-1 text-xs text-slate/70">Notas: {String(item.notes)}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
              Horarios del equipo
            </h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Puedes ver tu agenda y la del equipo, pero no editarla.
            </p>

            <div className="mt-4 grid gap-3">
              {Array.from(groupedWorkingHours.entries()).map(([staffName, items]) => (
                <div key={staffName} className="data-card rounded-[1.5rem] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/55 text-sm font-semibold text-ink dark:border-transparent dark:bg-white/[0.05] dark:text-slate-100">
                      {getInitials(staffName)}
                    </div>
                    <p className="text-base font-semibold text-ink dark:text-slate-100">
                      {staffName}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {items.map((entry) => (
                      <span
                        key={entry.id}
                        className="rounded-full border border-white/55 bg-white/45 px-3 py-1.5 text-[11px] font-semibold text-slate/80 dark:border-transparent dark:bg-white/[0.04] dark:text-slate-300"
                      >
                        {entry.dayLabel.slice(0, 3)} {entry.startTime}-{entry.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
              Mis ausencias
            </h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Las solicitudes nuevas quedan pendientes hasta que el admin las apruebe.
            </p>

            <div className="mt-4 grid gap-3">
              {myPendingTimeOff.length === 0 && myApprovedTimeOff.length === 0 ? (
                <p className="text-sm text-slate/70 dark:text-slate-400">
                  No tienes ausencias registradas.
                </p>
              ) : null}

              {myPendingTimeOff.map((item) => (
                <div key={`pending-${String(item.id)}`} className="data-card rounded-[1.5rem] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-slate-100">
                        {new Date(String(item.start_at)).toLocaleString('es-UY')}
                      </p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        hasta {new Date(String(item.end_at)).toLocaleString('es-UY')}
                      </p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        {stripPendingTimeOffReason(item.reason as string | null) || 'Sin motivo'}
                      </p>
                    </div>
                    <span className="meta-chip" data-tone="warning">
                      Pendiente
                    </span>
                  </div>
                </div>
              ))}

              {myApprovedTimeOff.map((item) => (
                <div key={`approved-${String(item.id)}`} className="data-card rounded-[1.5rem] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-slate-100">
                        {new Date(String(item.start_at)).toLocaleString('es-UY')}
                      </p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        hasta {new Date(String(item.end_at)).toLocaleString('es-UY')}
                      </p>
                      <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                        {stripPendingTimeOffReason(item.reason as string | null) || 'Sin motivo'}
                      </p>
                    </div>
                    <span className="meta-chip" data-tone="success">
                      Aprobada
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
            Cursos activos del local
          </h3>
          <p className="text-sm text-slate/80 dark:text-slate-300">
            El sistema todavia no modela asignacion de profesor por curso; por ahora ves el
            catalogo activo del workspace en modo lectura.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(coursesResult.data || []).length === 0 ? (
              <p className="text-sm text-slate/70 dark:text-slate-400">
                No hay cursos activos para esta barberia.
              </p>
            ) : null}

            {(coursesResult.data || []).map((course) => (
              <div key={String(course.id)} className="data-card rounded-[1.5rem] p-4">
                <p className="text-base font-semibold text-ink dark:text-slate-100">
                  {String(course.title)}
                </p>
                <p className="mt-2 text-xs text-slate/70 dark:text-slate-400">
                  {String(course.level)} | {String(course.duration_hours)} h
                </p>
                <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                  {formatCurrency(Number(course.price_cents || 0))}
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
