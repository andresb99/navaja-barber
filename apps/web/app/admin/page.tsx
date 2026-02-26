import { formatCurrency } from '@navaja/shared';
import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import { getDashboardMetrics } from '@/lib/metrics';

export default async function AdminHomePage() {
  const metrics = await getDashboardMetrics('today');

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Resumen administrativo</h1>
        <p className="mt-2 text-sm text-slate/80">Estado operativo de hoy.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardTitle>Facturacion (realizado)</CardTitle>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/appointments"
          className="soft-panel rounded-2xl border border-white/45 p-5 no-underline dark:border-slate-700"
        >
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">Gestionar citas</h2>
          <p className="mt-1 text-sm text-slate/80">Filtra y actualiza estados de reservas de hoy y proximas.</p>
        </Link>
        <Link
          href="/admin/metrics"
          className="soft-panel rounded-2xl border border-white/45 p-5 no-underline dark:border-slate-700"
        >
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">Metricas detalladas</h2>
          <p className="mt-1 text-sm text-slate/80">Facturacion, servicios top, desempeno por barbero y ocupacion.</p>
        </Link>
      </div>
    </section>
  );
}
