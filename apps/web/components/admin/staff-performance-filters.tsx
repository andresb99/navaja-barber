import Link from 'next/link';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import type {
  BookingMetricsChannelView,
  ResolvedMetricsRange,
  StaffPerformanceMetric,
} from '@/lib/metrics';
import { buildAdminHref } from '@/lib/workspace-routes';
import { SurfaceCheckbox } from '@/components/heroui/surface-field';

interface StaffPerformanceFiltersProps {
  shopSlug: string;
  dateRange: ResolvedMetricsRange;
  selectedChannel: BookingMetricsChannelView;
  compareSelection: string[];
  staff: Pick<StaffPerformanceMetric, 'staffId' | 'staffName'>[];
}

function buildRangeHref(
  shopSlug: string,
  range: 'today' | 'last7' | 'month',
  compareSelection: string[],
  selectedChannel: BookingMetricsChannelView,
) {
  return buildAdminHref('/admin/metrics', shopSlug, {
    range,
    compare: compareSelection,
    channel: selectedChannel,
  });
}

function buildChannelHref(
  shopSlug: string,
  channel: BookingMetricsChannelView,
  dateRange: ResolvedMetricsRange,
  compareSelection: string[],
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
    compare: compareSelection,
    channel,
  });
}

function getRangePillClassName(isActive: boolean) {
  if (isActive) {
    return 'border-white/70 bg-white/78 text-ink shadow-[0_14px_24px_-22px_rgba(56,189,248,0.34)] dark:border-transparent dark:bg-white/[0.06] dark:text-white';
  }

  return 'border-white/55 bg-white/40 text-slate/80 hover:bg-white/58 dark:border-transparent dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.05]';
}

export function StaffPerformanceFilters({
  shopSlug,
  dateRange,
  selectedChannel,
  compareSelection,
  staff,
}: StaffPerformanceFiltersProps) {
  return (
    <div className="spotlight-card soft-panel rounded-[2rem] border-0 p-5">
      <div className="grid gap-5 xl:grid-cols-[auto_1fr] xl:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href={buildRangeHref(shopSlug, 'today', compareSelection, selectedChannel)}
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                dateRange.rangeKey === 'today',
              )}`}
            >
              Hoy
            </Link>
            <Link
              href={buildRangeHref(shopSlug, 'last7', compareSelection, selectedChannel)}
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                dateRange.rangeKey === 'last7',
              )}`}
            >
              Ultimos 7 dias
            </Link>
            <Link
              href={buildRangeHref(shopSlug, 'month', compareSelection, selectedChannel)}
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                dateRange.rangeKey === 'month',
              )}`}
            >
              Este mes
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href={buildChannelHref(shopSlug, 'ALL', dateRange, compareSelection)}
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                selectedChannel === 'ALL',
              )}`}
            >
              Todos
            </Link>
            <Link
              href={buildChannelHref(shopSlug, 'ONLINE_ONLY', dateRange, compareSelection)}
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                selectedChannel === 'ONLINE_ONLY',
              )}`}
            >
              Solo online
            </Link>
            <Link
              href={buildChannelHref(shopSlug, 'WALK_INS_ONLY', dateRange, compareSelection)}
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold no-underline transition ${getRangePillClassName(
                selectedChannel === 'WALK_INS_ONLY',
              )}`}
            >
              Solo presenciales
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
          <input type="hidden" name="shop" value={shopSlug} />
          <input type="hidden" name="channel" value={selectedChannel} />
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
                  <SurfaceCheckbox
                    key={item.staffId}
                    name="compare"
                    value={item.staffId}
                    defaultSelected={isSelected}
                    classNames={{
                      base: `group max-w-full cursor-pointer rounded-2xl border px-3 py-3 transition ${
                        isSelected
                          ? 'border-white/75 bg-white/76 shadow-[0_14px_24px_-22px_rgba(56,189,248,0.34)] dark:border-transparent dark:bg-white/[0.06]'
                          : 'border-white/55 bg-white/42 hover:bg-white/58 dark:border-transparent dark:bg-white/[0.03] dark:hover:bg-white/[0.045]'
                      } group-data-[selected=true]:border-white/75 group-data-[selected=true]:bg-white/76 group-data-[selected=true]:shadow-[0_14px_24px_-22px_rgba(56,189,248,0.34)] dark:group-data-[selected=true]:border-transparent dark:group-data-[selected=true]:bg-white/[0.06]`,
                      wrapper: 'sr-only absolute opacity-0',
                      label: 'w-full',
                    }}
                  >
                    <span className="block text-sm font-semibold text-ink dark:text-slate-100">
                      {item.staffName}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                      {isSelected ? 'Incluido' : 'Disponible'}
                    </span>
                  </SurfaceCheckbox>
                );
              })}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
