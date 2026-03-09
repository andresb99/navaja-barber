import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { METRIC_RANGES, type MetricRangeKey } from '@/lib/constants';
import { isPendingTimeOffReason } from '@/lib/time-off-requests';
import { buildAdminHref } from '@/lib/workspace-routes';

type RawSearchParam = string | string[] | undefined;
export type BookingMetricsChannelView = 'ALL' | 'ONLINE_ONLY' | 'WALK_INS_ONLY';

export interface DashboardMetrics {
  rangeLabel: string;
  countsByStatus: Record<string, number>;
  estimatedRevenueCents: number;
  revenuePerAvailableHourCents: number;
  averageTicketCents: number;
  topServices: Array<{ service: string; count: number }>;
  revenueByStaff: Array<{ staff: string; revenue_cents: number }>;
  staffBreakdown: Array<{
    staffId: string;
    staffName: string;
    appointments: number;
    doneAppointments: number;
    revenueCents: number;
    averageRating: number;
    reviewCount: number;
  }>;
  availableMinutes: number;
  bookedMinutes: number;
  occupancyRatio: number;
  statusSummary: {
    pendingAppointments: number;
    confirmedAppointments: number;
    doneAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    activeQueueAppointments: number;
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
  };
  capacitySummary: {
    idleMinutes: number;
    utilizationGapRatio: number;
  };
  dailySeries: Array<{
    date: string;
    label: string;
    appointments: number;
    doneAppointments: number;
    revenueCents: number;
    onlineAppointments: number;
    walkInAppointments: number;
  }>;
  dailyRatingSeries: Array<{
    date: string;
    label: string;
    averageRating: number;
    reviewCount: number;
  }>;
  peakHours: Array<{
    hour: number;
    label: string;
    appointments: number;
  }>;
  channelMix: Array<{
    channel: string;
    label: string;
    appointments: number;
    doneAppointments: number;
    revenueCents: number;
    share: number;
  }>;
  channelBreakdown: {
    view: BookingMetricsChannelView;
    totalAppointments: number;
    onlineAppointments: number;
    walkInAppointments: number;
    filteredAppointments: number;
    onlineShare: number;
    walkInShare: number;
  };
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
const VALID_CHANNEL_VIEWS = new Set<BookingMetricsChannelView>([
  'ALL',
  'ONLINE_ONLY',
  'WALK_INS_ONLY',
]);

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

function normalizeSourceChannel(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return normalized || 'WEB';
}

function isWalkInChannel(value: unknown) {
  const channel = normalizeSourceChannel(value);
  return channel === 'WALK_IN' || channel === 'ADMIN_CREATED';
}

function isOnlineChannel(value: unknown) {
  const channel = normalizeSourceChannel(value);
  return channel === 'WEB' || channel === 'MOBILE';
}

function getSourceChannelLabel(value: unknown) {
  const channel = normalizeSourceChannel(value);

  if (channel === 'WEB') {
    return 'Web';
  }

  if (channel === 'MOBILE') {
    return 'Mobile app';
  }

  if (channel === 'WALK_IN') {
    return 'Walk-in';
  }

  if (channel === 'ADMIN_CREATED') {
    return 'Admin';
  }

  if (channel === 'WHATSAPP') {
    return 'WhatsApp';
  }

  if (channel === 'INSTAGRAM') {
    return 'Instagram';
  }

  if (channel === 'PHONE') {
    return 'Telefono';
  }

  return channel;
}

export function resolveBookingChannelView(
  value: RawSearchParam | BookingMetricsChannelView | string | undefined,
): BookingMetricsChannelView {
  const parsed = Array.isArray(value) ? value[0] : value;
  const normalized = String(parsed || '').trim().toUpperCase() as BookingMetricsChannelView;
  return VALID_CHANNEL_VIEWS.has(normalized) ? normalized : 'ALL';
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
  async (
    shopId: string,
    startAtIso: string,
    endAtIso: string,
    staffIdsKey: string,
  ): Promise<StaffPerformanceMetric[]> => {
    const supabase = await createSupabaseServerClient();
    const staffIds = staffIdsKey ? staffIdsKey.split(',') : null;
    const { data, error } = await supabase.rpc('get_staff_performance_summary', {
      p_shop_id: shopId,
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
  async (
    shopId: string,
    staffId: string,
    startAtIso: string,
    endAtIso: string,
  ): Promise<StaffRatingTrendPoint[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_staff_rating_trend', {
      p_shop_id: shopId,
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

function buildDashboardInsightsForShop(
  metrics: StaffPerformanceMetric[],
  shopSlug?: string,
): StaffPerformanceInsight[] {
  return buildDashboardInsights(metrics).map((item) => {
    if (!item.href || !item.href.startsWith('/admin/performance/')) {
      return item;
    }

    return {
      ...item,
      href: buildAdminHref(item.href, shopSlug),
    };
  });
}

export async function getStaffPerformanceDashboard(input?: {
  range?: RawSearchParam;
  from?: RawSearchParam;
  to?: RawSearchParam;
  compare?: RawSearchParam;
}, shopId?: string, shopSlug?: string): Promise<StaffPerformanceDashboardData> {
  if (!shopId) {
    throw new Error('No hay una barberia seleccionada para cargar metricas.');
  }

  const dateRange = resolveMetricsRange({
    range: coerceSearchParam(input?.range),
    from: coerceSearchParam(input?.from),
    to: coerceSearchParam(input?.to),
  });
  const compareSelection = parseComparisonSelection(input?.compare);
  const staff = await loadStaffPerformanceSummary(shopId, dateRange.startAtIso, dateRange.endAtIso, '');

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
    insights: buildDashboardInsightsForShop(staff, shopSlug),
  };
}

export async function getStaffPerformanceDetail(
  staffId: string,
  input?: { range?: RawSearchParam; from?: RawSearchParam; to?: RawSearchParam },
  shopId?: string,
): Promise<StaffPerformanceDetailData | null> {
  if (!shopId) {
    throw new Error('No hay una barberia seleccionada para cargar metricas.');
  }

  const dateRange = resolveMetricsRange({
    range: coerceSearchParam(input?.range),
    from: coerceSearchParam(input?.from),
    to: coerceSearchParam(input?.to),
  });

  const [metrics, ratingTrend] = await Promise.all([
    loadStaffPerformanceSummary(shopId, dateRange.startAtIso, dateRange.endAtIso, staffId),
    loadStaffRatingTrend(shopId, staffId, dateRange.startAtIso, dateRange.endAtIso),
  ]);

  const metric = metrics[0];
  if (!metric) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: reviews, error } = await supabase
    .from('appointment_reviews')
    .select('id, rating, comment, submitted_at, customers(name)')
    .eq('shop_id', shopId)
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

async function loadDashboardMetricsForRange(
  dateRange: ResolvedMetricsRange,
  shopId: string,
  channelView: BookingMetricsChannelView,
  staffId?: string,
): Promise<DashboardMetrics> {
  const supabase = await createSupabaseServerClient();

  const appointmentsQuery = supabase
    .from('appointments')
    .select('id, staff_id, status, price_cents, start_at, end_at, source_channel, services(name), staff(name)')
    .eq('shop_id', shopId)
    .gte('start_at', dateRange.startAtIso)
    .lt('start_at', dateRange.endAtIso);

  if (staffId) {
    appointmentsQuery.eq('staff_id', staffId);
  }

  const reviewsQuery = supabase
    .from('appointment_reviews')
    .select('appointment_id, rating, submitted_at')
    .eq('shop_id', shopId)
    .eq('status', 'published')
    .gte('submitted_at', dateRange.startAtIso)
    .lt('submitted_at', dateRange.endAtIso);

  if (staffId) {
    reviewsQuery.eq('staff_id', staffId);
  }

  const [{ data: appointments }, { data: reviews }, { data: workingHours }, { data: timeOff }] =
    await Promise.all([
    appointmentsQuery,
    reviewsQuery,
    supabase
      .from('working_hours')
      .select('staff_id, day_of_week, start_time, end_time')
      .eq('shop_id', shopId),
    supabase
      .from('time_off')
      .select('staff_id, start_at, end_at, reason')
      .eq('shop_id', shopId)
      .lt('start_at', dateRange.endAtIso)
      .gt('end_at', dateRange.startAtIso),
    ]);

  const allAppointments = (appointments || []) as Array<{
    id: string | null;
    staff_id: string | null;
    status: string | null;
    price_cents: number | null;
    start_at: string | null;
    end_at: string | null;
    source_channel: string | null;
    services?: { name?: string | null } | null;
    staff?: { name?: string | null } | null;
  }>;
  const publishedReviews = (reviews || []) as Array<{
    appointment_id: string | null;
    rating: number | null;
    submitted_at: string | null;
  }>;
  const rangeStart = new Date(dateRange.startAtIso);
  const rangeEnd = new Date(dateRange.endAtIso);
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  const dailySeriesMap = new Map<
    string,
    {
      date: string;
      label: string;
      appointments: number;
      doneAppointments: number;
      revenueCents: number;
      onlineAppointments: number;
      walkInAppointments: number;
    }
  >();
  const dailyRatingMap = new Map<
    string,
    {
      date: string;
      label: string;
      totalRating: number;
      reviewCount: number;
    }
  >();

  for (
    let cursor = new Date(rangeStart);
    cursor < rangeEnd;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const date = new Date(cursor);
    const dateKey = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString('es-UY', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    });

    const dayOfWeek = date.getUTCDay();
    dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
    dailySeriesMap.set(dateKey, {
      date: dateKey,
      label,
      appointments: 0,
      doneAppointments: 0,
      revenueCents: 0,
      onlineAppointments: 0,
      walkInAppointments: 0,
    });
    dailyRatingMap.set(dateKey, {
      date: dateKey,
      label,
      totalRating: 0,
      reviewCount: 0,
    });
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
    const dayIndex = Number(item.day_of_week || 0);
    const matchingDays = dayOfWeekCounts[dayIndex] || 0;
    return acc + Math.max(0, minutes) * matchingDays;
  }, 0);

  const timeOffMinutes = (timeOff || []).reduce((acc, item) => {
    if (isPendingTimeOffReason(item.reason as string | null)) {
      return acc;
    }

    const intervalMinutes = Math.round(
      (new Date(String(item.end_at)).getTime() - new Date(String(item.start_at)).getTime()) / 60000,
    );
    return acc + Math.max(0, intervalMinutes);
  }, 0);

  const countsByStatus: Record<string, number> = {};
  const serviceCounter = new Map<string, number>();
  const revenueByStaffMap = new Map<string, number>();
  const peakHoursMap = new Map<number, number>();
  const channelMixMap = new Map<
    string,
    {
      channel: string;
      label: string;
      appointments: number;
      doneAppointments: number;
      revenueCents: number;
    }
  >();
  const appointmentChannelById = new Map<string, string>();
  const appointmentStaffById = new Map<string, { staffId: string; staffName: string }>();
  const staffBreakdownMap = new Map<
    string,
    {
      staffId: string;
      staffName: string;
      appointments: number;
      doneAppointments: number;
      revenueCents: number;
      totalRating: number;
      reviewCount: number;
    }
  >();

  let totalFilteredAppointments = 0;
  let doneAppointmentsCount = 0;
  let estimatedRevenueCents = 0;
  let bookedMinutes = 0;
  let onlineAppointments = 0;
  let walkInAppointments = 0;

  for (const row of allAppointments) {
    const priceCents = parseInteger(row.price_cents);
    const channel = normalizeSourceChannel(row.source_channel);
    const appointmentId = String(row.id || '').trim();
    const staffName = String((row.staff as { name?: string } | null)?.name || 'Sin asignar');
    const normalizedStaffId = String(row.staff_id || '').trim() || `legacy:${staffName}`;

    if (appointmentId) {
      appointmentChannelById.set(appointmentId, channel);
      appointmentStaffById.set(appointmentId, {
        staffId: normalizedStaffId,
        staffName,
      });
    }
    const onlineChannel = isOnlineChannel(channel);
    const walkInChannel = isWalkInChannel(channel);
    const isInSelectedChannel =
      channelView === 'ALL' ||
      (channelView === 'ONLINE_ONLY' && onlineChannel) ||
      (channelView === 'WALK_INS_ONLY' && walkInChannel);

    if (onlineChannel) {
      onlineAppointments += 1;
    }
    if (walkInChannel) {
      walkInAppointments += 1;
    }

    const existingChannel = channelMixMap.get(channel) || {
      channel,
      label: getSourceChannelLabel(channel),
      appointments: 0,
      doneAppointments: 0,
      revenueCents: 0,
    };
    existingChannel.appointments += 1;
    if (row.status === 'done') {
      existingChannel.doneAppointments += 1;
      existingChannel.revenueCents += priceCents;
    }
    channelMixMap.set(channel, existingChannel);

    if (!isInSelectedChannel) {
      continue;
    }

    totalFilteredAppointments += 1;

    const status = String(row.status || 'desconocido');
    countsByStatus[status] = (countsByStatus[status] || 0) + 1;

    const serviceName = String((row.services as { name?: string } | null)?.name || 'Sin servicio');
    serviceCounter.set(serviceName, (serviceCounter.get(serviceName) || 0) + 1);

    const isDone = status === 'done';
    const currentStaff =
      staffBreakdownMap.get(normalizedStaffId) || {
        staffId: normalizedStaffId,
        staffName,
        appointments: 0,
        doneAppointments: 0,
        revenueCents: 0,
        totalRating: 0,
        reviewCount: 0,
      };
    currentStaff.appointments += 1;

    if (isDone) {
      doneAppointmentsCount += 1;
      estimatedRevenueCents += priceCents;
      revenueByStaffMap.set(staffName, (revenueByStaffMap.get(staffName) || 0) + priceCents);
      currentStaff.doneAppointments += 1;
      currentStaff.revenueCents += priceCents;
    }
    staffBreakdownMap.set(normalizedStaffId, currentStaff);

    const startAt = new Date(String(row.start_at || ''));
    const startAtMs = startAt.getTime();
    if (Number.isNaN(startAtMs)) {
      continue;
    }

    if (status === 'done' || status === 'confirmed' || status === 'pending') {
      const endAtMs = new Date(String(row.end_at || row.start_at || '')).getTime();
      if (!Number.isNaN(endAtMs)) {
        const start = Math.max(rangeStartMs, startAtMs);
        const end = Math.min(rangeEndMs, endAtMs);
        if (start < end) {
          bookedMinutes += Math.round((end - start) / 60000);
        }
      }
    }

    const dateKey = startAt.toISOString().slice(0, 10);
    const day = dailySeriesMap.get(dateKey);
    if (day) {
      day.appointments += 1;
      if (isDone) {
        day.doneAppointments += 1;
        day.revenueCents += priceCents;
      }
      if (onlineChannel) {
        day.onlineAppointments += 1;
      }
      if (walkInChannel) {
        day.walkInAppointments += 1;
      }
    }

    const hour = startAt.getUTCHours();
    peakHoursMap.set(hour, (peakHoursMap.get(hour) || 0) + 1);
  }

  const topServices = [...serviceCounter.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const revenueByStaff = [...revenueByStaffMap.entries()]
    .map(([staff, revenue_cents]) => ({ staff, revenue_cents }))
    .sort((left, right) => right.revenue_cents - left.revenue_cents);

  const averageTicketCents = doneAppointmentsCount
    ? Math.round(estimatedRevenueCents / doneAppointmentsCount)
    : 0;
  const availableMinutes = Math.max(0, workedMinutes - timeOffMinutes);
  const totalAppointments = allAppointments.length;
  const revenuePerAvailableHourCents =
    availableMinutes > 0 ? Math.round((estimatedRevenueCents * 60) / availableMinutes) : 0;

  const pendingAppointments = countsByStatus.pending || 0;
  const confirmedAppointments = countsByStatus.confirmed || 0;
  const cancelledAppointments = countsByStatus.cancelled || 0;
  const noShowAppointments = countsByStatus.no_show || 0;
  const activeQueueAppointments = pendingAppointments + confirmedAppointments;

  const channelMix = [...channelMixMap.values()]
    .sort((left, right) => right.appointments - left.appointments)
    .map((item) => ({
      ...item,
      share: totalAppointments > 0 ? item.appointments / totalAppointments : 0,
    }));

  for (const review of publishedReviews) {
    const appointmentId = String(review.appointment_id || '').trim();
    if (!appointmentId) {
      continue;
    }

    if (channelView !== 'ALL') {
      const reviewChannel = appointmentChannelById.get(appointmentId);
      if (!reviewChannel) {
        continue;
      }

      if (channelView === 'ONLINE_ONLY' && !isOnlineChannel(reviewChannel)) {
        continue;
      }

      if (channelView === 'WALK_INS_ONLY' && !isWalkInChannel(reviewChannel)) {
        continue;
      }
    }

    const submittedAt = new Date(String(review.submitted_at || ''));
    if (Number.isNaN(submittedAt.getTime())) {
      continue;
    }

    const dateKey = submittedAt.toISOString().slice(0, 10);
    const bucket = dailyRatingMap.get(dateKey);
    if (!bucket) {
      continue;
    }

    bucket.totalRating += parseNumeric(review.rating);
    bucket.reviewCount += 1;

    const staffForReview = appointmentStaffById.get(appointmentId);
    if (!staffForReview) {
      continue;
    }

    const staffBucket =
      staffBreakdownMap.get(staffForReview.staffId) || {
        staffId: staffForReview.staffId,
        staffName: staffForReview.staffName,
        appointments: 0,
        doneAppointments: 0,
        revenueCents: 0,
        totalRating: 0,
        reviewCount: 0,
      };
    staffBucket.totalRating += parseNumeric(review.rating);
    staffBucket.reviewCount += 1;
    staffBreakdownMap.set(staffForReview.staffId, staffBucket);
  }

  const dailySeries = [...dailySeriesMap.values()];
  const dailyRatingSeries = [...dailyRatingMap.values()].map((item) => ({
    date: item.date,
    label: item.label,
    averageRating:
      item.reviewCount > 0 ? Number((item.totalRating / item.reviewCount).toFixed(2)) : 0,
    reviewCount: item.reviewCount,
  }));
  const peakHours = [...peakHoursMap.entries()]
    .map(([hour, appointments]) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      appointments,
    }))
    .sort((left, right) => {
      if (right.appointments !== left.appointments) {
        return right.appointments - left.appointments;
      }

      return left.hour - right.hour;
    })
    .slice(0, 5);
  const staffBreakdown = [...staffBreakdownMap.values()]
    .map((item) => ({
      staffId: item.staffId,
      staffName: item.staffName,
      appointments: item.appointments,
      doneAppointments: item.doneAppointments,
      revenueCents: item.revenueCents,
      averageRating: item.reviewCount > 0 ? Number((item.totalRating / item.reviewCount).toFixed(2)) : 0,
      reviewCount: item.reviewCount,
    }))
    .sort((left, right) => {
      if (right.revenueCents !== left.revenueCents) {
        return right.revenueCents - left.revenueCents;
      }
      if (right.doneAppointments !== left.doneAppointments) {
        return right.doneAppointments - left.doneAppointments;
      }
      return right.appointments - left.appointments;
    });

  const idleMinutes = Math.max(0, availableMinutes - bookedMinutes);

  return {
    rangeLabel: dateRange.label,
    countsByStatus,
    estimatedRevenueCents,
    revenuePerAvailableHourCents,
    averageTicketCents,
    topServices,
    revenueByStaff,
    staffBreakdown,
    availableMinutes,
    bookedMinutes,
    occupancyRatio: availableMinutes > 0 ? bookedMinutes / availableMinutes : 0,
    statusSummary: {
      pendingAppointments,
      confirmedAppointments,
      doneAppointments: doneAppointmentsCount,
      cancelledAppointments,
      noShowAppointments,
      activeQueueAppointments,
      completionRate: totalFilteredAppointments > 0 ? doneAppointmentsCount / totalFilteredAppointments : 0,
      cancellationRate: totalFilteredAppointments > 0 ? cancelledAppointments / totalFilteredAppointments : 0,
      noShowRate: totalFilteredAppointments > 0 ? noShowAppointments / totalFilteredAppointments : 0,
    },
    capacitySummary: {
      idleMinutes,
      utilizationGapRatio: availableMinutes > 0 ? idleMinutes / availableMinutes : 0,
    },
    dailySeries,
    dailyRatingSeries,
    peakHours,
    channelMix,
    channelBreakdown: {
      view: channelView,
      totalAppointments,
      onlineAppointments,
      walkInAppointments,
      filteredAppointments: totalFilteredAppointments,
      onlineShare: totalAppointments > 0 ? onlineAppointments / totalAppointments : 0,
      walkInShare: totalAppointments > 0 ? walkInAppointments / totalAppointments : 0,
    },
  };
}

export async function getDashboardMetrics(
  range: MetricRangeKey,
  shopId: string,
  channelView: BookingMetricsChannelView = 'ALL',
  staffId?: string,
): Promise<DashboardMetrics> {
  return loadDashboardMetricsForRange(resolveMetricsRange({ range }), shopId, channelView, staffId);
}

export async function getDashboardMetricsForDateRange(
  input: { range?: string | undefined; from?: string | undefined; to?: string | undefined },
  shopId: string,
  channelView: BookingMetricsChannelView = 'ALL',
  staffId?: string,
): Promise<DashboardMetrics> {
  return loadDashboardMetricsForRange(resolveMetricsRange(input), shopId, channelView, staffId);
}
