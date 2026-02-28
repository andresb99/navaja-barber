import Link from 'next/link';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import type { ResolvedMetricsRange, StaffPerformanceMetric } from '@/lib/metrics';

interface StaffPerformanceFiltersProps {
  dateRange: ResolvedMetricsRange;
  compareSelection: string[];
  staff: Pick<StaffPerformanceMetric, 'staffId' | 'staffName'>[];
}

function buildRangeHref(range: 'today' | 'last7' | 'month', compareSelection: string[]) {
  const search = new URLSearchParams();
  search.set('range', range);

  for (const staffId of compareSelection) {
    search.append('compare', staffId);
  }

  return `/admin/metrics?${search.toString()}`;
}

function getRangePillClassName(isActive: boolean) {
  if (isActive) {
    return 'border-white/70 bg-white/78 text-ink shadow-[0_14px_24px_-22px_rgba(56,189,248,0.34)] dark:border-transparent dark:bg-white/[0.06] dark:text-white';
  }

  return 'border-white/55 bg-white/40 text-slate/80 hover:bg-white/58 dark:border-transparent dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.05]';
}

export function StaffPerformanceFilters({
  dateRange,
  compareSelection,
  staff,
}: StaffPerformanceFiltersProps) {
  return (
    <div className="spotlight-card soft-panel rounded-[2rem] border-0 p-5">
      <div className="grid gap-5 xl:grid-cols-[auto_1fr] xl:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href={buildRangeHref('today', compareSelection)}
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                dateRange.rangeKey === 'today',
              )}`}
            >
              Hoy
            </Link>
            <Link
              href={buildRangeHref('last7', compareSelection)}
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                dateRange.rangeKey === 'last7',
              )}`}
            >
              Ultimos 7 dias
            </Link>
            <Link
              href={buildRangeHref('month', compareSelection)}
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                dateRange.rangeKey === 'month',
              )}`}
            >
              Este mes
            </Link>
          </div>

          <div className="data-card max-w-sm rounded-[1.4rem] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Vista
            </p>
            <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
              Comparacion directa por tarjetas, sin el selector multiple nativo que se ve viejo.
            </p>
          </div>
        </div>

        <form method="get" className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr]">
            <div className="data-card rounded-[1.4rem] p-3">
              <Input
                id="from"
                name="from"
                type="date"
                label="Desde"
                labelPlacement="inside"
                defaultValue={dateRange.fromDate}
                classNames={{
                  input: 'temporal-placeholder-hidden',
                }}
              />
            </div>

            <div className="data-card rounded-[1.4rem] p-3">
              <Input
                id="to"
                name="to"
                type="date"
                label="Hasta"
                labelPlacement="inside"
                defaultValue={dateRange.toDate}
                classNames={{
                  input: 'temporal-placeholder-hidden',
                }}
              />
            </div>
          </div>

          <div className="data-card rounded-[1.5rem] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Comparar
                </p>
                <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">
                  Activos: {compareSelection.length || 0} perfiles seleccionados.
                </p>
              </div>
              <Button type="submit" className="action-primary px-5 text-sm font-semibold">
                Aplicar
              </Button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {staff.map((item) => {
                const isSelected = compareSelection.includes(item.staffId);

                return (
                  <label
                    key={item.staffId}
                    className={`cursor-pointer rounded-2xl border px-3 py-3 transition ${
                      isSelected
                        ? 'border-white/75 bg-white/76 shadow-[0_14px_24px_-22px_rgba(56,189,248,0.34)] dark:border-transparent dark:bg-white/[0.06]'
                        : 'border-white/55 bg-white/42 hover:bg-white/58 dark:border-transparent dark:bg-white/[0.03] dark:hover:bg-white/[0.045]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="compare"
                      value={item.staffId}
                      defaultChecked={isSelected}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold text-ink dark:text-slate-100">
                      {item.staffName}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                      {isSelected ? 'Incluido' : 'Disponible'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
