import { formatCurrency } from '@navaja/shared';
import { HealthChip } from '@/components/admin/health-chip';
import type { StaffPerformanceMetric } from '@/lib/metrics';

interface StaffComparisonTableProps {
  staff: StaffPerformanceMetric[];
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function StaffComparisonTable({ staff }: StaffComparisonTableProps) {
  if (staff.length < 2) {
    return null;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
      {staff.map((item) => (
        <div key={item.staffId} className="data-card rounded-[1.6rem] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                Perfil
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                {item.staffName}
              </p>
            </div>
            <HealthChip metric={item} />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/55 bg-white/40 px-3 py-2 dark:border-transparent dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                Facturacion
              </p>
              <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                {formatCurrency(item.totalRevenueCents)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/55 bg-white/40 px-3 py-2 dark:border-transparent dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                Por hora
              </p>
              <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                {formatCurrency(item.revenuePerAvailableHourCents)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/55 bg-white/40 px-3 py-2 dark:border-transparent dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                Ocupacion
              </p>
              <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                {formatPercent(item.occupancyRatio)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/55 bg-white/40 px-3 py-2 dark:border-transparent dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                Resena
              </p>
              <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                {item.trustedRating.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/50 pt-3 dark:border-transparent">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                Recompra
              </p>
              <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                {formatPercent(item.repeatClientRate)}
              </p>
            </div>
            <p className="text-xs text-slate/70 dark:text-slate-400">
              Eq. {item.staffCancellations} / Cli. {item.customerCancellations}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
