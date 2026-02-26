import Link from 'next/link';
import { formatCurrency } from '@navaja/shared';
import { getDashboardMetrics } from '@/lib/metrics';
import { Card, CardTitle } from '@/components/ui/card';

interface MetricsPageProps {
  searchParams: Promise<{ range?: 'today' | 'last7' | 'month' }>;
}

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistio',
  done: 'Realizada',
};

export default async function MetricsPage({ searchParams }: MetricsPageProps) {
  const params = await searchParams;
  const range = params.range || 'today';
  const metrics = await getDashboardMetrics(range);

  const maxTopService = Math.max(1, ...metrics.topServices.map((item) => item.count));
  const maxStaffRevenue = Math.max(1, ...metrics.revenueByStaff.map((item) => item.revenue_cents));

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Metricas</h1>
          <p className="mt-1 text-sm text-slate/80">{metrics.rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/admin/metrics?range=today"
            className={`rounded-md px-3 py-2 no-underline ${range === 'today' ? 'bg-ink text-white' : 'bg-white'}`}
          >
            Hoy
          </Link>
          <Link
            href="/admin/metrics?range=last7"
            className={`rounded-md px-3 py-2 no-underline ${range === 'last7' ? 'bg-ink text-white' : 'bg-white'}`}
          >
            Ultimos 7 dias
          </Link>
          <Link
            href="/admin/metrics?range=month"
            className={`rounded-md px-3 py-2 no-underline ${range === 'month' ? 'bg-ink text-white' : 'bg-white'}`}
          >
            Este mes
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardTitle>Facturacion estimada</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(metrics.estimatedRevenueCents)}</p>
        </Card>
        <Card>
          <CardTitle>Ticket promedio</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(metrics.averageTicketCents)}</p>
        </Card>
        <Card>
          <CardTitle>Ocupacion</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{Math.round(metrics.occupancyRatio * 100)}%</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Citas por estado</CardTitle>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(metrics.countsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-md bg-slate/5 px-3 py-2">
                <span>{statusLabel[status] || status}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Servicios mas pedidos</CardTitle>
          <div className="mt-3 space-y-3 text-sm">
            {metrics.topServices.map((item) => (
              <div key={item.service}>
                <div className="mb-1 flex items-center justify-between">
                  <span>{item.service}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 rounded bg-slate/10">
                  <div
                    className="h-2 rounded bg-brass"
                    style={{ width: `${Math.round((item.count / maxTopService) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Facturacion por barbero</CardTitle>
        <div className="mt-3 space-y-3 text-sm">
          {metrics.revenueByStaff.map((item) => (
            <div key={item.staff}>
              <div className="mb-1 flex items-center justify-between">
                <span>{item.staff}</span>
                <span>{formatCurrency(item.revenue_cents)}</span>
              </div>
              <div className="h-2 rounded bg-slate/10">
                <div
                  className="h-2 rounded bg-ink"
                  style={{ width: `${Math.round((item.revenue_cents / maxStaffRevenue) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
