import { formatCurrency } from '@navaja/shared';
import { SparkKpiCard } from '@/components/admin/spark-kpi-card';
import { Button } from '@heroui/button';
import { Bell, Plus } from 'lucide-react';
import { AdminHomeSchedule } from '@/components/admin/admin-home-schedule';
import { AdminNotificationsDigest } from '@/components/admin/admin-notifications-digest';
import { getAdminScheduleOverview } from '@/lib/admin-schedule';
import { getAdminNotificationsData } from '@/lib/admin-notifications';
import { requireAdmin } from '@/lib/auth';
import {
  deriveCalendarHours,
  resolveAppointmentEnd,
  toCalendarEventStatus,
} from '@/lib/calendar-schedule';
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

function startOfMonth(date: Date) {
  const normalized = new Date(date);
  normalized.setDate(1);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

export default async function AdminHomePage({ searchParams }: AdminHomePageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const scheduleStart = new Date();
  const scheduleRangeStart = startOfMonth(addMonths(scheduleStart, -1));
  const scheduleRangeEndExclusive = startOfMonth(addMonths(scheduleStart, 2));
  const [metrics, notifications, scheduleOverview] = await Promise.all([
    getDashboardMetrics('today', ctx.shopId),
    getAdminNotificationsData(ctx.shopId),
    getAdminScheduleOverview({
      shopId: ctx.shopId,
      fromIso: scheduleRangeStart.toISOString(),
      toIso: scheduleRangeEndExclusive.toISOString(),
    }),
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
  const ownerCalendarEvents = [
    ...scheduleOverview.appointments.map((appointment) => ({
      id: `appointment:${appointment.id}`,
      title: appointment.serviceName,
      clientName: appointment.customerName,
      resourceId: appointment.staffId,
      resourceName: appointment.staffName,
      start: new Date(appointment.startAt),
      end: resolveAppointmentEnd(appointment.startAt, appointment.endAt),
      status: toCalendarEventStatus(appointment.status),
      tone: toCalendarEventStatus(appointment.status),
    })),
    ...scheduleOverview.timeOffRecords.map((record) => ({
      id: `time-off:${record.id}`,
      title: record.reason || 'Bloque no disponible',
      clientName: record.isPending ? 'Ausencia pendiente' : 'Ausencia aprobada',
      resourceId: record.staffId,
      resourceName: record.staffName,
      start: new Date(record.startAt),
      end: new Date(record.endAt),
      tone: record.isPending ? ('pending' as const) : ('absence' as const),
      statusLabel: record.isPending ? 'Pendiente' : 'Ausencia',
    })),
  ];
  const ownerCalendarHours = deriveCalendarHours({
    workingHours: scheduleOverview.workingHours.map((item) => ({
      startTime: item.startTime,
      endTime: item.endTime,
    })),
    appointments: scheduleOverview.appointments.map((item) => ({
      startAt: item.startAt,
      endAt: item.endAt,
    })),
    timeOffRecords: scheduleOverview.timeOffRecords.map((item) => ({
      startAt: item.startAt,
      endAt: item.endAt,
    })),
  });

  return (
    <section className="flex flex-col gap-8 pb-10">
      <header className="flex flex-col justify-between border-b border-white/5 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">PANEL</p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-medium text-slate-100">
            Buen día, Lucas.
          </h1>
          <p className="mt-2 text-[13px] text-slate-400">
            Hoy tenés <strong className="text-slate-200">{activeAppointments} turnos confirmados</strong> y <strong className="text-slate-200">{urgentItemsCount} pendientes</strong>.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-0">
          <Button
            radius="full"
            variant="flat"
            className="h-10 bg-white/[0.04] px-4 text-xs font-semibold text-slate-300 border border-white/10"
          >
            <Bell className="mr-1.5 h-3.5 w-3.5 opacity-70" />
            Inbox - {urgentItemsCount}
          </Button>
          <Button
            radius="full"
            className="h-10 bg-[#e0d4ff] px-4 text-xs font-bold text-[#1a1130] hover:bg-[#d0bcff]"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Nuevo turno
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SparkKpiCard
          label="RESERVAS HOY"
          value={activeAppointments.toString()}
          badge="+12%"
          sparkPoints="M 0 30 Q 15 28, 30 25 T 60 20 T 100 15"
        />
        <SparkKpiCard
          label="INGRESOS"
          value={formatCurrency(metrics.estimatedRevenueCents)}
          badge="+8%"
          sparkPoints="M 0 30 Q 20 28, 40 22 T 70 15 T 100 5"
        />
        <SparkKpiCard
          label="OCUPACIÓN"
          value="86%"
          badge="+4%"
          sparkPoints="M 0 25 Q 25 25, 45 20 T 75 18 T 100 10"
        />
        <SparkKpiCard
          label="NPS"
          value="72"
          badge="-2"
          badgeTone="danger"
          sparkPoints="M 0 10 Q 15 10, 30 15 T 60 20 T 100 25"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="h-full rounded-[1.25rem] border border-white/5 bg-[#141218] p-5 lg:p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Agenda de hoy</h3>
                <p className="mt-1 text-xs text-slate-400 capitalize">
                  {new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'short' }).format(scheduleStart)}
                </p>
              </div>
            </div>
            
            <AdminHomeSchedule
              staff={scheduleOverview.staff}
              events={ownerCalendarEvents}
              startHour={ownerCalendarHours.startHour}
              endHour={ownerCalendarHours.endHour}
              initialDate={scheduleStart}
              availableRangeStart={scheduleRangeStart}
              availableRangeEndExclusive={scheduleRangeEndExclusive}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <div className="rounded-[1.25rem] border border-white/5 bg-[#141218] p-5 lg:p-6">
            <h3 className="text-base font-semibold text-white">Inbox</h3>
            <p className="mt-1 mb-5 text-xs text-slate-400">Mensajes y avisos</p>
            <div className="[&>section]:p-0 [&>section]:bg-transparent [&>section]:border-none [&>section_.meta-chip]:hidden [&>section_p.text-[11px]]:hidden [&>section_h2]:hidden [&>section_p.text-sm]:hidden">
               <AdminNotificationsDigest
                  shopSlug={ctx.shopSlug}
                  totalCount={notifications.totalCount}
                  pendingTimeOffCount={notifications.pendingTimeOffCount}
                  pendingMembershipCount={notifications.pendingMembershipCount}
                  stalePendingIntents={notifications.stalePendingIntents}
               />
            </div>
          </div>
          
          <div className="rounded-[1.25rem] border border-white/5 bg-[#141218] p-5 lg:p-6 flex-1">
             <h3 className="mb-1 text-base font-semibold text-white">Top barberos</h3>
             <p className="mb-6 text-xs text-slate-400">Semana</p>

             <div className="space-y-6">
               {(scheduleOverview.staff.slice(0, 3)).map((staff, idx) => {
                  const revenues = ['UYU 38K', 'UYU 31K', 'UYU 24K'];
                  const widths = ['w-[90%]', 'w-[75%]', 'w-[60%]'];
                  return (
                    <div key={staff.id} className="flex flex-col gap-2">
                       <div className="flex items-center justify-between text-xs font-semibold text-white">
                         <span>{staff.name}</span>
                         <span className="text-slate-400">{revenues[idx] || 'UYU 15K'}</span>
                       </div>
                       <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full ${widths[idx] || 'w-1/2'}`}></div>
                       </div>
                    </div>
                  )
               })}
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
