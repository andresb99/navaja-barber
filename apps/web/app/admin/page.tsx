import { formatCurrency } from '@navaja/shared';
import Link from 'next/link';
import { Card, CardBody } from '@heroui/card';
import { getDashboardMetrics } from '@/lib/metrics';

export default async function AdminHomePage() {
  const metrics = await getDashboardMetrics('today');

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Panel admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Resumen administrativo
            </h1>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              Resumen de hoy con una lectura mas clara y menos cajas pesadas.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Facturacion
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {formatCurrency(metrics.estimatedRevenueCents)}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Ticket
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {formatCurrency(metrics.averageTicketCents)}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Ocupacion
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {Math.round(metrics.occupancyRatio * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="data-card rounded-[1.7rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
              Facturacion (realizado)
            </h3>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(metrics.estimatedRevenueCents)}
            </p>
          </CardBody>
        </Card>
        <Card className="data-card rounded-[1.7rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Ticket promedio</h3>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(metrics.averageTicketCents)}
            </p>
          </CardBody>
        </Card>
        <Card className="data-card rounded-[1.7rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Ocupacion</h3>
            <p className="mt-2 text-2xl font-semibold">
              {Math.round(metrics.occupancyRatio * 100)}%
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/appointments"
          className="data-card rounded-2xl border-0 p-5 no-underline"
        >
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">
            Gestionar citas
          </h2>
          <p className="mt-1 text-sm text-slate/80">
            Filtra y actualiza estados de reservas de hoy y proximas.
          </p>
        </Link>
        <Link href="/admin/metrics" className="data-card rounded-2xl border-0 p-5 no-underline">
          <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink">
            Metricas detalladas
          </h2>
          <p className="mt-1 text-sm text-slate/80">
            Facturacion, servicios top, desempeno por barbero y ocupacion.
          </p>
        </Link>
      </div>
    </section>
  );
}
