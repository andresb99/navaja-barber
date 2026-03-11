import Link from 'next/link';
import { formatCurrency } from '@navaja/shared';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Input } from '@heroui/input';
import { MetricsApexOverview } from '@/components/admin/metrics-apex-overview';
import { requireAdmin } from '@/lib/auth';
import { getDashboardMetricsForDateRange, getStaffPerformanceDashboard } from '@/lib/metrics';
import { buildAdminHref } from '@/lib/workspace-routes';
import { Container } from '@/components/heroui/container';

interface MetricsPageProps {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    staff?: string;
    shop?: string;
  }>;
}

type SparkTone = 'cyan' | 'amber' | 'violet';

interface MetricSparkCardProps {
  id: string;
  label: string;
  value: string;
  hint: string;
  series: number[];
  tone: SparkTone;
}

function getRangePillClassName(isActive: boolean) {
  if (isActive) {
    return 'border-white/65 bg-white/72 text-ink dark:border-white/12 dark:bg-white/[0.08] dark:text-slate-100';
  }

  return 'border-white/45 bg-white/36 text-slate/80 hover:bg-white/52 dark:border-white/6 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.05]';
}

const filterPanelSectionClassName =
  'rounded-[1.45rem] border border-white/58 bg-white/42 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] dark:border-white/10 dark:bg-[rgb(22,19,36)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]';

function coerceStaffId(value: string | undefined) {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function buildRangeHref(
  shopSlug: string,
  range: 'today' | 'last7' | 'month',
  selectedStaffId?: string,
) {
  return buildAdminHref('/admin/metrics', shopSlug, {
    range,
    ...(selectedStaffId ? { staff: selectedStaffId } : {}),
  });
}

function buildStaffHref(
  shopSlug: string,
  dateRange: { rangeKey: string; fromDate: string; toDate: string },
  staffId?: string,
) {
  return buildAdminHref('/admin/metrics', shopSlug, {
    ...(dateRange.rangeKey === 'custom'
      ? {
          from: dateRange.fromDate,
          to: dateRange.toDate,
        }
      : {
          range: dateRange.rangeKey,
        }),
    ...(staffId ? { staff: staffId } : {}),
  });
}

function clamp(value: number, min: number, max: number) {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function buildSparklinePaths(values: number[], width = 260, height = 84, padding = 8) {
  const clean = values
    .map((value) => (Number.isFinite(value) ? value : 0))
    .filter((value) => Number.isFinite(value));
  const safeValues =
    clean.length >= 2 ? clean : clean.length === 1 ? [clean[0] || 0, clean[0] || 0] : [0, 0];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const step = (width - padding * 2) / Math.max(safeValues.length - 1, 1);

  const points = safeValues.map((value, index) => {
    const x = padding + index * step;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);

    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x.toFixed(2)} ${(
    height - padding
  ).toFixed(2)} L ${points[0]?.x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;
  const lastPoint = points[points.length - 1] || { x: width - padding, y: height - padding };

  return {
    linePath,
    areaPath,
    lastPoint,
  };
}

function getSparkPalette(tone: SparkTone) {
  if (tone === 'amber') {
    return {
      stroke: '#f59e0b',
      dot: '#fbbf24',
      gradientFrom: 'rgba(245,158,11,0.42)',
      gradientTo: 'rgba(245,158,11,0.02)',
    };
  }

  if (tone === 'violet') {
    return {
      stroke: '#a855f7',
      dot: '#c084fc',
      gradientFrom: 'rgba(168,85,247,0.4)',
      gradientTo: 'rgba(168,85,247,0.02)',
    };
  }

  return {
    stroke: '#0ea5e9',
    dot: '#38bdf8',
    gradientFrom: 'rgba(14,165,233,0.42)',
    gradientTo: 'rgba(14,165,233,0.02)',
  };
}

function MetricSparkCard({ id, label, value, hint, series, tone }: MetricSparkCardProps) {
  const spark = buildSparklinePaths(series);
  const palette = getSparkPalette(tone);
  const gradientId = `spark-${id}`;

  return (
    <Card className="data-card overflow-hidden rounded-[1.7rem] border-0 shadow-none">
      <CardBody className="relative p-5 pb-24">
        <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
          {label}
        </p>
        <p className="relative z-10 mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
          {value}
        </p>
        <p className="relative z-10 mt-2 text-xs text-slate/70 dark:text-slate-400">{hint}</p>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 h-[88px] overflow-hidden rounded-xl">
          <svg viewBox="0 0 260 84" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.gradientFrom} />
                <stop offset="100%" stopColor={palette.gradientTo} />
              </linearGradient>
            </defs>
            <path d={spark.areaPath} fill={`url(#${gradientId})`} />
            <path
              d={spark.linePath}
              fill="none"
              stroke={palette.stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx={spark.lastPoint.x} cy={spark.lastPoint.y} r="4" fill={palette.dot} />
          </svg>
        </div>
      </CardBody>
    </Card>
  );
}

export default async function MetricsPage({ searchParams }: MetricsPageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const selectedStaffId = coerceStaffId(params.staff);
  const [dashboard, businessMetrics] = await Promise.all([
    getStaffPerformanceDashboard(
      {
        range: params.range,
        from: params.from,
        to: params.to,
      },
      ctx.shopId,
      ctx.shopSlug,
    ),
    getDashboardMetricsForDateRange(
      {
        range: params.range,
        from: params.from,
        to: params.to,
      },
      ctx.shopId,
      'ALL',
      selectedStaffId,
    ),
  ]);

  const selectedStaff = selectedStaffId
    ? dashboard.staff.find((item) => item.staffId === selectedStaffId) || null
    : null;
  const viewStaffBreakdownById = new Map(
    businessMetrics.staffBreakdown.map((item) => [item.staffId, item]),
  );
  const selectedStaffBreakdown = selectedStaffId
    ? viewStaffBreakdownById.get(selectedStaffId) || null
    : null;
  const bookingsSeries = businessMetrics.dailySeries.map((item) => Number(item.appointments || 0));
  const revenueSeries = businessMetrics.dailySeries.map((item) => Number(item.revenueCents || 0));
  const effectiveBookingsValue = businessMetrics.channelBreakdown.filteredAppointments;
  const effectiveBookingsSeries = bookingsSeries;
  const effectiveBookingsHint = `Online ${businessMetrics.channelBreakdown.onlineAppointments} | Presenciales ${businessMetrics.channelBreakdown.walkInAppointments}`;
  const effectiveRevenueValueCents = businessMetrics.estimatedRevenueCents;
  const effectiveRevenueSeries = revenueSeries;
  const effectiveRevenueHint = 'Valor cobrado en citas realizadas';
  const viewRatingTotals = businessMetrics.staffBreakdown.reduce(
    (acc, item) => {
      acc.reviewCount += item.reviewCount;
      acc.ratingScore += item.averageRating * item.reviewCount;
      return acc;
    },
    {
      reviewCount: 0,
      ratingScore: 0,
    },
  );
  const teamRatingInView =
    viewRatingTotals.reviewCount > 0
      ? viewRatingTotals.ratingScore / viewRatingTotals.reviewCount
      : 0;
  const ratingValue = selectedStaffBreakdown
    ? selectedStaffBreakdown.averageRating
    : teamRatingInView;
  const ratingHint = selectedStaff
    ? `${selectedStaffBreakdown?.reviewCount || 0} resenas verificadas`
    : viewRatingTotals.reviewCount > 0
      ? `${viewRatingTotals.reviewCount} resenas verificadas`
      : 'Sin resenas verificadas en esta vista';

  const ratingSeries = selectedStaffBreakdown
    ? [ratingValue - 0.2, ratingValue - 0.1, ratingValue, ratingValue + 0.05, ratingValue].map(
        (value) => Number(clamp(value, 0, 5).toFixed(2)),
      )
    : businessMetrics.staffBreakdown.map((item) => item.averageRating);
  const staffComparisonDataMap = new Map(
    dashboard.staff.map((item) => [
      item.staffId,
      {
        staffId: item.staffId,
        staffName: item.staffName,
        totalRevenueCents: 0,
        completedAppointments: 0,
        trustedRating: 0,
      },
    ]),
  );
  for (const row of businessMetrics.staffBreakdown) {
    const existing = staffComparisonDataMap.get(row.staffId);
    if (existing) {
      existing.totalRevenueCents = row.revenueCents;
      existing.completedAppointments = row.doneAppointments;
      existing.trustedRating = row.averageRating;
      continue;
    }

    staffComparisonDataMap.set(row.staffId, {
      staffId: row.staffId,
      staffName: row.staffName,
      totalRevenueCents: row.revenueCents,
      completedAppointments: row.doneAppointments,
      trustedRating: row.averageRating,
    });
  }
  const staffComparisonData = [...staffComparisonDataMap.values()].sort((left, right) => {
    if (right.totalRevenueCents !== left.totalRevenueCents) {
      return right.totalRevenueCents - left.totalRevenueCents;
    }
    return right.completedAppointments - left.completedAppointments;
  });
  const metricsViewKey = [
    dashboard.dateRange.rangeKey,
    dashboard.dateRange.fromDate,
    dashboard.dateRange.toDate,
    selectedStaffId || 'business',
  ].join(':');

  return (
    <section className="space-y-6">
      <Container
        variant="pageHeader"
        className="relative overflow-hidden rounded-[2.5rem] px-6 py-7 md:px-8 md:py-9"
      >
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Metricas</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.25rem] dark:text-slate-100">
              Dashboard operativo
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Lectura rapida para el dia a dia: reservas, facturacion y calidad del servicio.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="admin-premium-subcard rounded-[1.35rem] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Rango
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {dashboard.dateRange.label}
              </p>
            </div>
            <div className="admin-premium-subcard rounded-[1.35rem] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Vista
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {selectedStaff ? selectedStaff.staffName : 'Negocio completo'}
              </p>
            </div>
          </div>
        </div>
      </Container>

      <Container
        as={Card}
        variant="section"
        className="overflow-hidden rounded-[2rem]"
        shadow="none"
      >
        <CardBody className="space-y-5 p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Filtros
              </p>
              <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                Ajusta periodo y vista del equipo.
              </p>
            </div>
            <div className="hidden rounded-full border border-white/50 bg-white/30 px-3 py-1.5 text-xs font-medium text-slate/75 dark:border-white/8 dark:bg-white/[0.03] dark:text-slate-300 sm:block">
              {dashboard.dateRange.label}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
            <div className="grid gap-3">
              <div className={filterPanelSectionClassName}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Periodo
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Link
                    href={buildRangeHref(ctx.shopSlug, 'today', selectedStaffId)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                      dashboard.dateRange.rangeKey === 'today',
                    )}`}
                  >
                    Hoy
                  </Link>
                  <Link
                    href={buildRangeHref(ctx.shopSlug, 'last7', selectedStaffId)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                      dashboard.dateRange.rangeKey === 'last7',
                    )}`}
                  >
                    Ultimos 7 dias
                  </Link>
                  <Link
                    href={buildRangeHref(ctx.shopSlug, 'month', selectedStaffId)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                      dashboard.dateRange.rangeKey === 'month',
                    )}`}
                  >
                    Este mes
                  </Link>
                </div>
              </div>

              <div className={filterPanelSectionClassName}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Barbero
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={buildStaffHref(ctx.shopSlug, dashboard.dateRange)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                      !selectedStaffId,
                    )}`}
                  >
                    Negocio
                  </Link>
                  {dashboard.staff.map((staff) => (
                    <Link
                      key={staff.staffId}
                      href={buildStaffHref(ctx.shopSlug, dashboard.dateRange, staff.staffId)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                        selectedStaffId === staff.staffId,
                      )}`}
                    >
                      {staff.staffName}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <form
              method="get"
              action={buildAdminHref('/admin/metrics', ctx.shopSlug)}
              className={`${filterPanelSectionClassName} grid gap-3 sm:grid-cols-2`}
            >
              <input type="hidden" name="shop" value={ctx.shopSlug} />
              {selectedStaffId ? (
                <input type="hidden" name="staff" value={selectedStaffId} />
              ) : null}

              <div className="sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Rango personalizado
                </p>
                <p className="mt-1 text-xs text-slate/75 dark:text-slate-300">
                  Define fechas exactas para analizar el periodo.
                </p>
              </div>

              <Input
                id="from"
                name="from"
                type="date"
                label="Desde"
                labelPlacement="inside"
                defaultValue={dashboard.dateRange.fromDate}
                classNames={{
                  input: 'temporal-placeholder-hidden',
                }}
              />
              <Input
                id="to"
                name="to"
                type="date"
                label="Hasta"
                labelPlacement="inside"
                defaultValue={dashboard.dateRange.toDate}
                classNames={{
                  input: 'temporal-placeholder-hidden',
                }}
              />
              <div className="sm:col-span-2 sm:flex sm:justify-end">
                <Button
                  type="submit"
                  color="primary"
                  className="w-full rounded-[1rem] px-5 text-sm font-semibold shadow-[0_14px_28px_-22px_rgba(139,92,246,0.42)] sm:w-auto sm:min-w-[132px]"
                >
                  Aplicar
                </Button>
              </div>
            </form>
          </div>
        </CardBody>
      </Container>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricSparkCard
          id="real-bookings"
          label="Reservas reales"
          value={`${effectiveBookingsValue}`}
          hint={effectiveBookingsHint}
          series={effectiveBookingsSeries}
          tone="cyan"
        />
        <MetricSparkCard
          id="revenue"
          label="Facturacion"
          value={formatCurrency(effectiveRevenueValueCents)}
          hint={effectiveRevenueHint}
          series={effectiveRevenueSeries}
          tone="amber"
        />
        <MetricSparkCard
          id="rating"
          label="Puntuacion"
          value={ratingValue.toFixed(1)}
          hint={ratingHint}
          series={ratingSeries}
          tone="violet"
        />
      </div>

      <MetricsApexOverview
        key={metricsViewKey}
        metrics={businessMetrics}
        {...(selectedStaffId ? { selectedStaffId } : {})}
        {...(selectedStaff?.staffName ? { selectedStaffName: selectedStaff.staffName } : {})}
        staffComparison={staffComparisonData}
      />
    </section>
  );
}
