import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { Card, CardBody } from '@heroui/card';
import { HealthChip } from '@/components/admin/health-chip';
import { KpiCard } from '@/components/admin/kpi-card';
import { MetricBar } from '@/components/admin/metric-bar';
import { getStaffPerformanceDetail } from '@/lib/metrics';

interface StaffPerformanceDetailPageProps {
  params: Promise<{ staffId: string }>;
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
  }>;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} h`;
}

function buildBackHref(from: string, to: string) {
  const search = new URLSearchParams({
    from,
    to,
  });

  return `/admin/metrics?${search.toString()}`;
}

export default async function StaffPerformanceDetailPage({
  params,
  searchParams,
}: StaffPerformanceDetailPageProps) {
  const [{ staffId }, filters] = await Promise.all([params, searchParams]);
  const detail = await getStaffPerformanceDetail(staffId, filters);

  if (!detail) {
    notFound();
  }

  const maxTrendValue = Math.max(5, ...detail.ratingTrend.map((item) => item.averageRating));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={buildBackHref(detail.dateRange.fromDate, detail.dateRange.toDate)} className="text-sm text-ink underline">
            Volver a metricas
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">
            {detail.metric.staffName}
          </h1>
          <p className="mt-1 text-sm text-slate/80">{detail.dateRange.label}</p>
        </div>
        <HealthChip metric={detail.metric} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Facturacion" value={formatCurrency(detail.metric.totalRevenueCents)} />
        <KpiCard
          label="Facturacion / hora"
          value={formatCurrency(detail.metric.revenuePerAvailableHourCents)}
        />
        <KpiCard label="Ocupacion" value={formatPercent(detail.metric.occupancyRatio)} />
        <KpiCard label="Ticket promedio" value={formatCurrency(detail.metric.averageTicketCents)} />
        <KpiCard
          label="Reseña"
          value={`${detail.metric.trustedRating.toFixed(1)} (${detail.metric.reviewCount})`}
        />
        <KpiCard label="Recompra" value={formatPercent(detail.metric.repeatClientRate)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">
              Productividad
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Horas disponibles</span>
                <span className="font-semibold">{formatHours(detail.metric.availableMinutes)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Horas reservadas</span>
                <span className="font-semibold">{formatHours(detail.metric.bookedMinutes)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Horas atendidas</span>
                <span className="font-semibold">{formatHours(detail.metric.serviceMinutes)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Realizadas</span>
                <span className="font-semibold">{detail.metric.completedAppointments}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">
              Confiabilidad
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Canceladas por equipo</span>
                <span className="font-semibold">{detail.metric.staffCancellations}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Canceladas por cliente</span>
                <span className="font-semibold">{detail.metric.customerCancellations}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>No show</span>
                <span className="font-semibold">{detail.metric.noShowAppointments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tasa de cancelacion</span>
                <span className="font-semibold">{formatPercent(detail.metric.cancellationRate)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">
              Clientes
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Clientes unicos</span>
                <span className="font-semibold">{detail.metric.uniqueCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Clientes repetidos</span>
                <span className="font-semibold">{detail.metric.repeatCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Reseñas</span>
                <span className="font-semibold">{detail.metric.reviewCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Promedio bruto</span>
                <span className="font-semibold">{detail.metric.averageRating.toFixed(1)}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">
                Tendencia de reseñas
              </h2>
              <p className="text-sm text-slate/80">Promedio mensual verificado del periodo.</p>
            </div>

            <div className="space-y-3">
              {detail.ratingTrend.map((item) => (
                <div key={item.periodStart} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {new Date(`${item.periodStart}T00:00:00.000Z`).toLocaleDateString('es-UY', {
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </span>
                    <span className="font-semibold">
                      {item.averageRating.toFixed(1)} ({item.reviewCount})
                    </span>
                  </div>
                  <MetricBar value={item.averageRating} max={maxTrendValue} tone="brass" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">
                Reseñas recientes
              </h2>
              <p className="text-sm text-slate/80">Ultimos comentarios publicados del rango.</p>
            </div>

            {detail.recentReviews.length ? (
              <div className="space-y-3">
                {detail.recentReviews.map((review) => (
                  <div key={review.id} className="rounded-2xl bg-slate/5 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-ink dark:text-slate-100">{review.customerName}</p>
                      <p className="text-xs text-slate/70">
                        {new Date(review.submittedAt).toLocaleDateString('es-UY')}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate/70">{review.rating} / 5</p>
                    {review.comment ? <p className="mt-2 text-slate/80">{review.comment}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate/80">No hay reseñas publicadas en este rango.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">
            Lectura rapida
          </h2>
          <div className="space-y-2 text-sm text-slate/80">
            {detail.insights.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
