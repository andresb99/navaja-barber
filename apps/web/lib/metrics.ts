import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { METRIC_RANGES, type MetricRangeKey, SHOP_ID } from '@/lib/constants';

type RawSearchParam = string | string[] | undefined;

export interface DashboardMetrics {
  rangeLabel: string;
  countsByStatus: Record<string, number>;
  estimatedRevenueCents: number;
  averageTicketCents: number;
  topServices: Array<{ service: string; count: number }>;
  revenueByStaff: Array<{ staff: string; revenue_cents: number }>;
  occupancyRatio: number;
}

export type StaffHealthStatus = 'top' | 'healthy' | 'attention';

export interface StaffPerformanceMetric {
  staffId: string;
  staffName: string;
  totalRevenueCents: number;
  completedAppointments: number;
  availableMinutes: number;
  bookedMinutes: number;
  serviceMinutes: number;
  revenuePerAvailableHourCents: number;
  occupancyRatio: number;
  staffCancellations: number;
  customerCancellations: number;
  adminCancellations: number;
  systemCancellations: number;
  totalCancellations: number;
  noShowAppointments: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatClientRate: number;
  reviewCount: number;
  averageRating: number;
  shopAverageRating: number;
  trustedRating: number;
  averageTicketCents: number;
  cancellationRate: number;
  health: StaffHealthStatus;
  healthLabel: string;
  healthTone: 'success' | 'warning' | 'danger';
}

export interface StaffPerformanceInsight {
  label: string;
  value: string;
  href?: string;
}

export interface ResolvedMetricsRange {
  rangeKey: MetricRangeKey | 'custom';
  label: string;
  fromDate: string;
  toDate: string;
  startAtIso: string;
  endAtIso: string;
}

export interface StaffPerformanceDashboardData {
  dateRange: ResolvedMetricsRange;
  team: {
    totalRevenueCents: number;
    revenuePerAvailableHourCents: number;
    occupancyRatio: number;
    averageRating: number;
    averageTicketCents: number;
  };
  staff: StaffPerformanceMetric[];
  compareSelection: string[];
  compareMetrics: StaffPerformanceMetric[];
  insights: StaffPerformanceInsight[];
}

export interface StaffRatingTrendPoint {
  periodStart: string;
  averageRating: number;
  reviewCount: number;
}

export interface RecentStaffReview {
  id: string;
  rating: number;
  comment: string | null;
  submittedAt: string;
  customerName: string;
}

export interface StaffPerformanceDetailData {
  dateRange: ResolvedMetricsRange;
  metric: StaffPerformanceMetric;
  ratingTrend: StaffRatingTrendPoint[];
  recentReviews: RecentStaffReview[];
  insights: string[];
}

interface StaffPerformanceSummaryRow {
  staff_id: string | null;
  staff_name: string | null;
  total_revenue_cents: number | string | null;
  completed_appointments: number | null;
  available_minutes: number | null;
  booked_minutes: number | null;
  service_minutes: number | null;
  revenue_per_available_hour: number | string | null;
  occupancy_ratio: number | null;
  staff_cancellations: number | null;
  customer_cancellations: number | null;
  admin_cancellations: number | null;
  system_cancellations: number | null;
  total_cancellations: number | null;
  no_show_appointments: number | null;
  unique_customers: number | null;
  repeat_customers: number | null;
  repeat_client_rate: number | null;
  review_count: number | null;
  average_rating: number | null;
  shop_average_rating: number | null;
}

interface StaffRatingTrendRow {
  period_start: string | null;
  review_count: number | null;
  average_rating: number | null;
}

const VALID_RANGE_KEYS = new Set<MetricRangeKey>(Object.values(METRIC_RANGES));

function parseNumeric(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseInteger(value: number | string | null | undefined): number {
  return Math.max(0, Math.round(parseNumeric(value)));
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function isDateOnly(value: string | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function atUtcStartOfDay(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function formatRangeLabel(fromDate: string, toDate: string) {
  const from = atUtcStartOfDay(fromDate);
  const to = atUtcStartOfDay(toDate);
  const sameDay = fromDate === toDate;

  if (sameDay) {
    return from.toLocaleDateString('es-UY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  return `${from.toLocaleDateString('es-UY', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })} - ${to.toLocaleDateString('es-UY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })}`;
}

function resolveMetricsRange(input?: {
  range?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}): ResolvedMetricsRange {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (isDateOnly(input?.from) && isDateOnly(input?.to)) {
    const requestedStart = atUtcStartOfDay(input.from);
    const requestedEndInclusive = atUtcStartOfDay(input.to);
    const start = requestedStart <= requestedEndInclusive ? requestedStart : requestedEndInclusive;
    const endInclusive = requestedStart <= requestedEndInclusive ? requestedEndInclusive : requestedStart;
    const end = new Date(endInclusive);
    end.setUTCDate(end.getUTCDate() + 1);
    const fromDate = toDateOnly(start);
    const toDate = toDateOnly(endInclusive);

    return {
      rangeKey: 'custom',
      label: formatRangeLabel(fromDate, toDate),
      fromDate,
      toDate,
      startAtIso: start.toISOString(),
      endAtIso: end.toISOString(),
    };
  }

  const range = VALID_RANGE_KEYS.has(input?.range as MetricRangeKey)
    ? (input?.range as MetricRangeKey)
    : METRIC_RANGES.today;

  const start = new Date(todayStart);
  const end = new Date(todayStart);

  if (range === METRIC_RANGES.today) {
    end.setUTCDate(end.getUTCDate() + 1);

    return {
      rangeKey: range,
      label: 'Hoy',
      fromDate: toDateOnly(start),
      toDate: toDateOnly(start),
      startAtIso: start.toISOString(),
      endAtIso: end.toISOString(),
    };
  }

  if (range === METRIC_RANGES.last7) {
    start.setUTCDate(start.getUTCDate() - 6);
    end.setUTCDate(end.getUTCDate() + 1);

    return {
      rangeKey: range,
      label: 'Ultimos 7 dias',
      fromDate: toDateOnly(start),
      toDate: toDateOnly(new Date(end.getTime() - 24 * 60 * 60 * 1000)),
      startAtIso: start.toISOString(),
      endAtIso: end.toISOString(),
    };
  }

  start.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(1);

  return {
    rangeKey: range,
    label: 'Este mes',
    fromDate: toDateOnly(start),
    toDate: toDateOnly(new Date(end.getTime() - 24 * 60 * 60 * 1000)),
    startAtIso: start.toISOString(),
    endAtIso: end.toISOString(),
  };
}

function coerceSearchParam(value: RawSearchParam) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseComparisonSelection(value: RawSearchParam): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const next = new Set<string>();

  for (const entry of values) {
    for (const token of entry.split(',')) {
      const candidate = token.trim();
      if (candidate) {
        next.add(candidate);
      }
      if (next.size >= 4) {
        return [...next];
      }
    }
  }

  return [...next];
}

export function calculateTrustedRating(
  averageRating: number,
  reviewCount: number,
  shopAverageRating: number,
  minimumReviewWeight = 5,
) {
  const v = Math.max(0, reviewCount);
  const m = Math.max(1, minimumReviewWeight);
  const r = Math.max(0, averageRating);
  const c = Math.max(0, shopAverageRating);

  return Number((((v / (v + m)) * r + (m / (v + m)) * c).toFixed(2)));
}

function getHealthStatus(metric: {
  occupancyRatio: number;
  trustedRating: number;
  reviewCount: number;
  staffCancellations: number;
  totalCancellations: number;
  completedAppointments: number;
}): Pick<StaffPerformanceMetric, 'health' | 'healthLabel' | 'healthTone'> {
  const totalTrackedAppointments = metric.completedAppointments + metric.totalCancellations;
  const staffCancellationRate =
    totalTrackedAppointments > 0 ? metric.staffCancellations / totalTrackedAppointments : 0;

  if (
    metric.occupancyRatio >= 0.8 &&
    metric.trustedRating >= 4.6 &&
    staffCancellationRate <= 0.04 &&
    metric.completedAppointments >= 3
  ) {
    return {
      health: 'top',
      healthLabel: 'Top',
      healthTone: 'success',
    };
  }

  if (
    metric.occupancyRatio < 0.55 ||
    staffCancellationRate > 0.08 ||
    (metric.reviewCount >= 5 && metric.trustedRating < 4.3)
  ) {
    return {
      health: 'attention',
      healthLabel: 'Atencion',
      healthTone: 'danger',
    };
  }

  return {
    health: 'healthy',
    healthLabel: 'Saludable',
    healthTone: 'warning',
  };
}

function mapSummaryRow(row: StaffPerformanceSummaryRow): StaffPerformanceMetric {
  const totalRevenueCents = parseInteger(row.total_revenue_cents);
  const completedAppointments = parseInteger(row.completed_appointments);
  const availableMinutes = parseInteger(row.available_minutes);
  const bookedMinutes = parseInteger(row.booked_minutes);
  const reviewCount = parseInteger(row.review_count);
  const averageRating = Number(parseNumeric(row.average_rating).toFixed(2));
  const shopAverageRating = Number(parseNumeric(row.shop_average_rating).toFixed(2));
  const trustedRating = calculateTrustedRating(averageRating, reviewCount, shopAverageRating);
  const totalCancellations = parseInteger(row.total_cancellations);
  const cancellationBase = completedAppointments + totalCancellations;
  const averageTicketCents = completedAppointments > 0 ? Math.round(totalRevenueCents / completedAppointments) : 0;

  const baseMetric: StaffPerformanceMetric = {
    staffId: String(row.staff_id || ''),
    staffName: String(row.staff_name || 'Barbero'),
    totalRevenueCents,
    completedAppointments,
    availableMinutes,
    bookedMinutes,
    serviceMinutes: parseInteger(row.service_minutes),
    revenuePerAvailableHourCents: parseInteger(row.revenue_per_available_hour),
    occupancyRatio: clampRatio(parseNumeric(row.occupancy_ratio)),
    staffCancellations: parseInteger(row.staff_cancellations),
    customerCancellations: parseInteger(row.customer_cancellations),
    adminCancellations: parseInteger(row.admin_cancellations),
    systemCancellations: parseInteger(row.system_cancellations),
    totalCancellations,
    noShowAppointments: parseInteger(row.no_show_appointments),
    uniqueCustomers: parseInteger(row.unique_customers),
    repeatCustomers: parseInteger(row.repeat_customers),
    repeatClientRate: clampRatio(parseNumeric(row.repeat_client_rate)),
    reviewCount,
    averageRating,
    shopAverageRating,
    trustedRating,
    averageTicketCents,
    cancellationRate: cancellationBase > 0 ? totalCancellations / cancellationBase : 0,
    health: 'healthy',
    healthLabel: 'Saludable',
    healthTone: 'warning',
  };

  return {
    ...baseMetric,
    ...getHealthStatus(baseMetric),
  };
}

const loadStaffPerformanceSummary = cache(
  async (startAtIso: string, endAtIso: string, staffIdsKey: string): Promise<StaffPerformanceMetric[]> => {
    const supabase = await createSupabaseServerClient();
    const staffIds = staffIdsKey ? staffIdsKey.split(',') : null;
    const { data, error } = await supabase.rpc('get_staff_performance_summary', {
      p_shop_id: SHOP_ID,
      p_start: startAtIso,
      p_end: endAtIso,
      p_staff_ids: staffIds,
    });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data || []) as StaffPerformanceSummaryRow[];
    return rows.map(mapSummaryRow);
  },
);

const loadStaffRatingTrend = cache(
  async (staffId: string, startAtIso: string, endAtIso: string): Promise<StaffRatingTrendPoint[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_staff_rating_trend', {
      p_shop_id: SHOP_ID,
      p_staff_id: staffId,
      p_start: startAtIso,
      p_end: endAtIso,
    });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data || []) as StaffRatingTrendRow[];
    return rows.map((row) => ({
      periodStart: String(row.period_start || ''),
      reviewCount: parseInteger(row.review_count),
      averageRating: Number(parseNumeric(row.average_rating).toFixed(2)),
    }));
  },
);

function buildDashboardInsights(metrics: StaffPerformanceMetric[]): StaffPerformanceInsight[] {
  if (!metrics.length) {
    return [];
  }

  const topPerformer = [...metrics].sort((left, right) => {
    if (right.revenuePerAvailableHourCents !== left.revenuePerAvailableHourCents) {
      return right.revenuePerAvailableHourCents - left.revenuePerAvailableHourCents;
    }

    return right.trustedRating - left.trustedRating;
  })[0];

  const strongestRetention = [...metrics].sort((left, right) => {
    if (right.repeatClientRate !== left.repeatClientRate) {
      return right.repeatClientRate - left.repeatClientRate;
    }

    return right.repeatCustomers - left.repeatCustomers;
  })[0];

  const needsAttention = metrics.find((item) => item.health === 'attention');

  const lowestReviewCoverage = [...metrics]
    .filter((item) => item.completedAppointments > 0)
    .sort((left, right) => {
      const leftCoverage = left.completedAppointments > 0 ? left.reviewCount / left.completedAppointments : 1;
      const rightCoverage = right.completedAppointments > 0 ? right.reviewCount / right.completedAppointments : 1;
      return leftCoverage - rightCoverage;
    })[0];

  const insights: StaffPerformanceInsight[] = [];

  if (topPerformer) {
    insights.push({
      label: 'Mejor por hora',
      value: topPerformer.staffName,
      href: `/admin/performance/${topPerformer.staffId}`,
    });
  }

  if (strongestRetention) {
    insights.push({
      label: 'Mejor retencion',
      value: strongestRetention.staffName,
      href: `/admin/performance/${strongestRetention.staffId}`,
    });
  }

  if (needsAttention) {
    insights.push({
      label: 'Revisar',
      value: needsAttention.staffName,
      href: `/admin/performance/${needsAttention.staffId}`,
    });
  }

  if (lowestReviewCoverage) {
    insights.push({
      label: 'Pocas reseñas',
      value: lowestReviewCoverage.staffName,
      href: `/admin/performance/${lowestReviewCoverage.staffId}`,
    });
  }

  return insights.slice(0, 4);
}

export async function getStaffPerformanceDashboard(input?: {
  range?: RawSearchParam;
  from?: RawSearchParam;
  to?: RawSearchParam;
  compare?: RawSearchParam;
}): Promise<StaffPerformanceDashboardData> {
  const dateRange = resolveMetricsRange({
    range: coerceSearchParam(input?.range),
    from: coerceSearchParam(input?.from),
    to: coerceSearchParam(input?.to),
  });
  const compareSelection = parseComparisonSelection(input?.compare);
  const staff = await loadStaffPerformanceSummary(dateRange.startAtIso, dateRange.endAtIso, '');

  const compareMetrics =
    compareSelection.length >= 2
      ? staff.filter((item) => compareSelection.includes(item.staffId)).slice(0, 4)
      : [];

  const totals = staff.reduce(
    (acc, item) => {
      acc.totalRevenueCents += item.totalRevenueCents;
      acc.totalAvailableMinutes += item.availableMinutes;
      acc.totalBookedMinutes += item.bookedMinutes;
      acc.totalReviewCount += item.reviewCount;
      acc.totalReviewScore += item.averageRating * item.reviewCount;
      acc.totalCompletedAppointments += item.completedAppointments;
      return acc;
    },
    {
      totalRevenueCents: 0,
      totalAvailableMinutes: 0,
      totalBookedMinutes: 0,
      totalReviewCount: 0,
      totalReviewScore: 0,
      totalCompletedAppointments: 0,
    },
  );

  return {
    dateRange,
    team: {
      totalRevenueCents: totals.totalRevenueCents,
      revenuePerAvailableHourCents:
        totals.totalAvailableMinutes > 0
          ? Math.round((totals.totalRevenueCents * 60) / totals.totalAvailableMinutes)
          : 0,
      occupancyRatio:
        totals.totalAvailableMinutes > 0 ? totals.totalBookedMinutes / totals.totalAvailableMinutes : 0,
      averageRating:
        totals.totalReviewCount > 0
          ? Number((totals.totalReviewScore / totals.totalReviewCount).toFixed(2))
          : 0,
      averageTicketCents:
        totals.totalCompletedAppointments > 0
          ? Math.round(totals.totalRevenueCents / totals.totalCompletedAppointments)
          : 0,
    },
    staff,
    compareSelection,
    compareMetrics,
    insights: buildDashboardInsights(staff),
  };
}

export async function getStaffPerformanceDetail(
  staffId: string,
  input?: { range?: RawSearchParam; from?: RawSearchParam; to?: RawSearchParam },
): Promise<StaffPerformanceDetailData | null> {
  const dateRange = resolveMetricsRange({
    range: coerceSearchParam(input?.range),
    from: coerceSearchParam(input?.from),
    to: coerceSearchParam(input?.to),
  });

  const [metrics, ratingTrend] = await Promise.all([
    loadStaffPerformanceSummary(dateRange.startAtIso, dateRange.endAtIso, staffId),
    loadStaffRatingTrend(staffId, dateRange.startAtIso, dateRange.endAtIso),
  ]);

  const metric = metrics[0];
  if (!metric) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: reviews, error } = await supabase
    .from('appointment_reviews')
    .select('id, rating, comment, submitted_at, customers(name)')
    .eq('shop_id', SHOP_ID)
    .eq('staff_id', staffId)
    .eq('status', 'published')
    .gte('submitted_at', dateRange.startAtIso)
    .lt('submitted_at', dateRange.endAtIso)
    .order('submitted_at', { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  const recentReviews: RecentStaffReview[] = (reviews || []).map((review) => ({
    id: String(review.id),
    rating: parseInteger(review.rating as number | null),
    comment: ((review.comment as string | null) || null)?.trim() || null,
    submittedAt: String(review.submitted_at),
    customerName: String((review.customers as { name?: string } | null)?.name || 'Cliente'),
  }));

  const insights: string[] = [];

  if (metric.occupancyRatio < 0.6) {
    insights.push('La ocupacion esta por debajo del nivel esperado para el periodo.');
  }

  if (metric.staffCancellations > 0 && metric.cancellationRate > 0.05) {
    insights.push('Las cancelaciones hechas por el equipo requieren seguimiento.');
  }

  if (metric.completedAppointments >= 8 && metric.reviewCount < 3) {
    insights.push('El volumen atendido es bueno, pero faltan reseñas verificadas.');
  }

  if (metric.repeatClientRate >= 0.45) {
    insights.push('La recompra esta fuerte y sostiene el desempeño del periodo.');
  }

  if (!insights.length) {
    insights.push('El desempeno se mantiene estable en los indicadores clave.');
  }

  return {
    dateRange,
    metric,
    ratingTrend,
    recentReviews,
    insights,
  };
}

export async function getDashboardMetrics(range: MetricRangeKey): Promise<DashboardMetrics> {
  const dateRange = resolveMetricsRange({ range });
  const supabase = await createSupabaseServerClient();

  const [{ data: appointments }, { data: workingHours }, { data: timeOff }] = await Promise.all([
    supabase
      .from('appointments')
      .select('status, price_cents, start_at, end_at, services(name), staff(name)')
      .eq('shop_id', env.NEXT_PUBLIC_SHOP_ID)
      .gte('start_at', dateRange.startAtIso)
      .lt('start_at', dateRange.endAtIso),
    supabase
      .from('working_hours')
      .select('staff_id, day_of_week, start_time, end_time')
      .eq('shop_id', env.NEXT_PUBLIC_SHOP_ID),
    supabase
      .from('time_off')
      .select('staff_id, start_at, end_at')
      .eq('shop_id', env.NEXT_PUBLIC_SHOP_ID)
      .lt('start_at', dateRange.endAtIso)
      .gt('end_at', dateRange.startAtIso),
  ]);

  const list = appointments || [];
  const countsByStatus = list.reduce<Record<string, number>>((acc, item) => {
    const status = String(item.status || 'desconocido');
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const doneAppointments = list.filter((item) => item.status === 'done');
  const estimatedRevenueCents = doneAppointments.reduce((acc, item) => acc + parseInteger(item.price_cents), 0);
  const averageTicketCents = doneAppointments.length ? Math.round(estimatedRevenueCents / doneAppointments.length) : 0;

  const serviceCounter = new Map<string, number>();
  for (const row of list) {
    const serviceName = String((row.services as { name?: string } | null)?.name || 'Sin servicio');
    serviceCounter.set(serviceName, (serviceCounter.get(serviceName) || 0) + 1);
  }

  const topServices = [...serviceCounter.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const revenueByStaffMap = new Map<string, number>();
  for (const row of doneAppointments) {
    const staffName = String((row.staff as { name?: string } | null)?.name || 'Sin asignar');
    revenueByStaffMap.set(staffName, (revenueByStaffMap.get(staffName) || 0) + parseInteger(row.price_cents));
  }

  const revenueByStaff = [...revenueByStaffMap.entries()]
    .map(([staff, revenue_cents]) => ({ staff, revenue_cents }))
    .sort((left, right) => right.revenue_cents - left.revenue_cents);

  const rangeStart = new Date(dateRange.startAtIso);
  const rangeEnd = new Date(dateRange.endAtIso);
  const rangeDates: Date[] = [];
  for (
    let cursor = new Date(rangeStart);
    cursor < rangeEnd;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    rangeDates.push(new Date(cursor));
  }

  const workedMinutes = (workingHours || []).reduce((acc, item) => {
    const [startHour = 0, startMinute = 0] = String(item.start_time)
      .split(':')
      .slice(0, 2)
      .map((part) => Number(part) || 0);
    const [endHour = 0, endMinute = 0] = String(item.end_time)
      .split(':')
      .slice(0, 2)
      .map((part) => Number(part) || 0);
    const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    const matchingDays = rangeDates.filter((date) => date.getUTCDay() === Number(item.day_of_week || 0)).length;
    return acc + Math.max(0, minutes) * matchingDays;
  }, 0);

  const timeOffMinutes = (timeOff || []).reduce((acc, item) => {
    const intervalMinutes = Math.round(
      (new Date(String(item.end_at)).getTime() - new Date(String(item.start_at)).getTime()) / 60000,
    );
    return acc + Math.max(0, intervalMinutes);
  }, 0);

  const availableMinutes = Math.max(0, workedMinutes - timeOffMinutes);
  const bookedMinutes = list
    .filter((item) => item.status === 'done' || item.status === 'confirmed' || item.status === 'pending')
    .reduce((acc, item) => {
      const start = Math.max(rangeStart.getTime(), new Date(String(item.start_at)).getTime());
      const end = Math.min(
        rangeEnd.getTime(),
        new Date(String(item.end_at || item.start_at)).getTime(),
      );
      if (start >= end) {
        return acc;
      }

      return acc + Math.round((end - start) / 60000);
    }, 0);

  return {
    rangeLabel: dateRange.label,
    countsByStatus,
    estimatedRevenueCents,
    averageTicketCents,
    topServices,
    revenueByStaff,
    occupancyRatio: availableMinutes > 0 ? bookedMinutes / availableMinutes : 0,
  };
}
