import Link from 'next/link';
import { formatCurrency } from '@navaja/shared';
import { Card, CardBody } from '@heroui/card';
import { HealthChip } from '@/components/admin/health-chip';
import { KpiCard } from '@/components/admin/kpi-card';
import { MetricBar } from '@/components/admin/metric-bar';
import { StaffComparisonTable } from '@/components/admin/staff-comparison-table';
import { StaffPerformanceFilters } from '@/components/admin/staff-performance-filters';
import { getStaffPerformanceDashboard } from '@/lib/metrics';

interface MetricsPageProps {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    compare?: string | string[];
  }>;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} h`;
}

function buildDetailHref(staffId: string, from: string, to: string) {
  const search = new URLSearchParams({
    from,
    to,
  });

  return `/admin/performance/${staffId}?${search.toString()}`;
}

export default async function MetricsPage({ searchParams }: MetricsPageProps) {
  const params = await searchParams;
  const dashboard = await getStaffPerformanceDashboard(params);
  const maxRevenue = Math.max(1, ...dashboard.staff.map((item) => item.totalRevenueCents));

  return (
    <section className="space-y-7">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Metricas</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Rendimiento del equipo
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Un dashboard mas limpio y mas util: comparaciones, ingresos, traccion y alertas sin la
              densidad visual anterior.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Rango
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {dashboard.dateRange.label}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Comparando
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {dashboard.compareMetrics.length || dashboard.compareSelection.length || 0} perfiles
              </p>
            </div>
          </div>
        </div>
      </div>

      <StaffPerformanceFilters
        dateRange={dashboard.dateRange}
        compareSelection={dashboard.compareSelection}
        staff={dashboard.staff}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Facturacion" value={formatCurrency(dashboard.team.totalRevenueCents)} />
        <KpiCard
          label="Facturacion / hora"
          value={formatCurrency(dashboard.team.revenuePerAvailableHourCents)}
        />
        <KpiCard label="Ocupacion" value={formatPercent(dashboard.team.occupancyRatio)} />
        <KpiCard label="Resena promedio" value={dashboard.team.averageRating.toFixed(1)} />
        <KpiCard
          label="Ticket promedio"
          value={formatCurrency(dashboard.team.averageTicketCents)}
        />
      </div>

      {dashboard.insights.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.insights.map((item) => (
            <Link
              key={`${item.label}-${item.value}`}
              href={item.href || '/admin/metrics'}
              className="data-card block rounded-[1.6rem] p-4 no-underline"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                {item.label}
              </p>
              <p className="mt-3 text-xl font-semibold text-ink dark:text-slate-100">
                {item.value}
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      {dashboard.compareMetrics.length >= 2 ? (
        <Card className="spotlight-card soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="space-y-3 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink dark:text-slate-100">
                  Comparacion directa
                </h2>
                <p className="text-sm text-slate/80 dark:text-slate-300">
                  Vista rapida de 2 a 4 miembros del equipo.
                </p>
              </div>
            </div>
            <StaffComparisonTable staff={dashboard.compareMetrics} />
          </CardBody>
        </Card>
      ) : null}

      <div className="space-y-4">
        {dashboard.staff.map((item) => (
          <Card
            key={item.staffId}
            className="spotlight-card soft-panel rounded-[2rem] border-0 shadow-none"
          >
            <CardBody className="space-y-5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-ink dark:text-slate-100">
                      {item.staffName}
                    </h2>
                    <HealthChip metric={item} />
                  </div>
                  <p className="text-sm text-slate/80 dark:text-slate-300">
                    {item.completedAppointments} realizadas, {item.reviewCount} resenas
                  </p>
                </div>

                <div className="grid min-w-[280px] gap-2 sm:grid-cols-3">
                  <div className="data-card rounded-2xl p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                      Facturacion
                    </p>
                    <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                      {formatCurrency(item.totalRevenueCents)}
                    </p>
                  </div>
                  <div className="data-card rounded-2xl p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                      Por hora
                    </p>
                    <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                      {formatCurrency(item.revenuePerAvailableHourCents)}
                    </p>
                  </div>
                  <div className="data-card rounded-2xl p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                      Recompra
                    </p>
                    <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                      {formatPercent(item.repeatClientRate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="data-card rounded-[1.6rem] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                        Traccion
                      </p>
                      <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                        Ocupacion {formatPercent(item.occupancyRatio)} y ticket promedio{' '}
                        {formatCurrency(item.averageTicketCents)}.
                      </p>
                    </div>
                    <p className="text-2xl font-semibold text-ink dark:text-slate-100">
                      {formatPercent(item.occupancyRatio)}
                    </p>
                  </div>

                  <div className="mt-4">
                    <MetricBar
                      value={item.totalRevenueCents}
                      max={maxRevenue}
                      tone={
                        item.health === 'attention'
                          ? 'rose'
                          : item.health === 'top'
                            ? 'brass'
                            : 'ink'
                      }
                    />
                  </div>
                </div>

                <div className="data-card rounded-[1.6rem] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                    Resena
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                    {item.trustedRating.toFixed(1)}
                  </p>
                  <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                    {item.reviewCount} valoraciones procesadas
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="data-card rounded-2xl p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                    Disponibles
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {formatHours(item.availableMinutes)}
                  </p>
                </div>
                <div className="data-card rounded-2xl p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                    Reservadas
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {formatHours(item.bookedMinutes)}
                  </p>
                </div>
                <div className="data-card rounded-2xl p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                    Cancelaciones
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {item.staffCancellations + item.customerCancellations}
                  </p>
                  <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                    Eq. {item.staffCancellations} / Cli. {item.customerCancellations}
                  </p>
                </div>
                <div className="data-card rounded-2xl p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                    No show
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {item.noShowAppointments}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/45 pt-4 dark:border-white/6">
                <p className="text-sm text-slate/80 dark:text-slate-300">
                  Ticket {formatCurrency(item.averageTicketCents)} | Retencion{' '}
                  {formatPercent(item.repeatClientRate)}
                </p>
                <Link
                  href={buildDetailHref(
                    item.staffId,
                    dashboard.dateRange.fromDate,
                    dashboard.dateRange.toDate,
                  )}
                  className="inline-flex rounded-full border border-white/55 bg-white/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] no-underline text-ink transition hover:bg-white/68 dark:border-transparent dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.06]"
                >
                  Ver detalle
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
