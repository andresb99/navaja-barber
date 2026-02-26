import { calculateBookedMinutes } from '@navaja/shared';
import { env } from './env';
import { createSupabaseAdminClient } from './supabase/admin';

export interface DashboardMetrics {
  rangeLabel: string;
  countsByStatus: Record<string, number>;
  estimatedRevenueCents: number;
  averageTicketCents: number;
  topServices: Array<{ service: string; count: number }>;
  revenueByStaff: Array<{ staff: string; revenue_cents: number }>;
  occupancyRatio: number;
}

function parseTimePart(value: string | number | null | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDateRange(range: 'today' | 'last7' | 'month') {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);

  if (range === 'today') {
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end, label: 'Hoy' };
  }

  if (range === 'last7') {
    start.setUTCDate(start.getUTCDate() - 6);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end, label: 'Ultimos 7 dias' };
  }

  start.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(1);
  return { start, end, label: 'Este mes' };
}

export async function getDashboardMetrics(range: 'today' | 'last7' | 'month'): Promise<DashboardMetrics> {
  const { start, end, label } = getDateRange(range);
  const supabase = createSupabaseAdminClient();

  const [{ data: appointments }, { data: workingHours }, { data: timeOff }] = await Promise.all([
    supabase
      .from('appointments')
      .select('status, price_cents, start_at, end_at, service_id, staff_id, services(name), staff(name)')
      .eq('shop_id', env.NEXT_PUBLIC_SHOP_ID)
      .gte('start_at', start.toISOString())
      .lt('start_at', end.toISOString()),
    supabase
      .from('working_hours')
      .select('staff_id, day_of_week, start_time, end_time')
      .eq('shop_id', env.NEXT_PUBLIC_SHOP_ID),
    supabase
      .from('time_off')
      .select('staff_id, start_at, end_at')
      .eq('shop_id', env.NEXT_PUBLIC_SHOP_ID)
      .lt('start_at', end.toISOString())
      .gt('end_at', start.toISOString()),
  ]);

  const list = appointments || [];
  const countsByStatus = list.reduce<Record<string, number>>((acc, item) => {
    const status = (item.status as string) || 'desconocido';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const doneAppointments = list.filter((item) => item.status === 'done');
  const estimatedRevenueCents = doneAppointments.reduce((acc, item) => acc + Number(item.price_cents || 0), 0);
  const averageTicketCents = doneAppointments.length
    ? Math.round(estimatedRevenueCents / doneAppointments.length)
    : 0;

  const serviceCounter = new Map<string, number>();
  for (const row of list) {
    const serviceName = (row.services as { name?: string } | null)?.name || 'Sin servicio';
    serviceCounter.set(serviceName, (serviceCounter.get(serviceName) || 0) + 1);
  }

  const topServices = [...serviceCounter.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const revenueByStaffMap = new Map<string, number>();
  for (const row of doneAppointments) {
    const staffName = (row.staff as { name?: string } | null)?.name || 'Sin asignar';
    revenueByStaffMap.set(staffName, (revenueByStaffMap.get(staffName) || 0) + Number(row.price_cents || 0));
  }

  const revenueByStaff = [...revenueByStaffMap.entries()]
    .map(([staff, revenue_cents]) => ({ staff, revenue_cents }))
    .sort((a, b) => b.revenue_cents - a.revenue_cents);

  const rangeDates: Date[] = [];
  for (let cursor = new Date(start); cursor < end; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
    rangeDates.push(new Date(cursor));
  }

  const workedMinutes = (workingHours || []).reduce((acc, item) => {
    const [startHourRaw, startMinuteRaw] = String(item.start_time)
      .split(':')
      .slice(0, 2)
      .map(Number);
    const [endHourRaw, endMinuteRaw] = String(item.end_time)
      .split(':')
      .slice(0, 2)
      .map(Number);
    const startHour = parseTimePart(startHourRaw);
    const startMinute = parseTimePart(startMinuteRaw);
    const endHour = parseTimePart(endHourRaw);
    const endMinute = parseTimePart(endMinuteRaw);
    const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    const matchingDays = rangeDates.filter((date) => date.getUTCDay() === Number(item.day_of_week || 0)).length;
    return acc + Math.max(0, minutes) * matchingDays;
  }, 0);

  const timeOffMinutes = (timeOff || []).reduce((acc, item) => {
    const intervalMinutes = Math.round((new Date(String(item.end_at)).getTime() - new Date(String(item.start_at)).getTime()) / 60000);
    return acc + Math.max(0, intervalMinutes);
  }, 0);

  const availableMinutes = Math.max(0, workedMinutes - timeOffMinutes);
  const bookedMinutes = calculateBookedMinutes(
    list.map((item) => ({
      status: String(item.status),
      start_at: String(item.start_at),
      end_at: String(item.end_at),
    })),
    start.toISOString(),
    end.toISOString(),
  );

  const occupancyRatio = availableMinutes ? bookedMinutes / availableMinutes : 0;

  return {
    rangeLabel: label,
    countsByStatus,
    estimatedRevenueCents,
    averageTicketCents,
    topServices,
    revenueByStaff,
    occupancyRatio,
  };
}

