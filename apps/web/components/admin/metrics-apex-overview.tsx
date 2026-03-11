'use client';

import type { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { formatCurrency } from '@navaja/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardMetrics } from '@/lib/metrics';

const ApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] animate-pulse rounded-[1.4rem] bg-white/45 dark:bg-white/[0.04]" />
  ),
});

interface MetricsApexOverviewProps {
  metrics: DashboardMetrics;
  selectedStaffId?: string;
  selectedStaffName?: string;
  staffComparison: Array<{
    staffId: string;
    staffName: string;
    totalRevenueCents: number;
    completedAppointments: number;
    trustedRating: number;
  }>;
}

type AreaViewKey =
  | 'REVENUE'
  | 'TOTAL_BOOKINGS'
  | 'ONLINE_BOOKINGS'
  | 'WALK_IN_BOOKINGS'
  | 'STAFF_REVENUE'
  | 'STAFF_RATING'
  | 'SHOP_RATING';
type PieViewKey = 'STATUS' | 'CHANNEL';

const AREA_VIEW_OPTIONS: Array<{ key: AreaViewKey; label: string }> = [
  { key: 'REVENUE', label: 'Facturacion' },
  { key: 'SHOP_RATING', label: 'Calificacion general' },
  { key: 'TOTAL_BOOKINGS', label: 'Reservas' },
  { key: 'ONLINE_BOOKINGS', label: 'Solo web' },
  { key: 'WALK_IN_BOOKINGS', label: 'Solo presencial' },
  { key: 'STAFF_REVENUE', label: 'Barberos' },
  { key: 'STAFF_RATING', label: 'Calificacion barberos' },
];
const AREA_VIEW_OPTIONS_STAFF_FOCUS: Array<{ key: AreaViewKey; label: string }> = [
  { key: 'REVENUE', label: 'Facturacion' },
  { key: 'SHOP_RATING', label: 'Calificacion' },
  { key: 'TOTAL_BOOKINGS', label: 'Reservas' },
  { key: 'ONLINE_BOOKINGS', label: 'Solo web' },
  { key: 'WALK_IN_BOOKINGS', label: 'Solo presencial' },
];

const STATUS_DEFINITIONS: Array<{ key: string; label: string; color: string }> = [
  { key: 'done', label: 'Realizadas', color: '#22c55e' },
  { key: 'confirmed', label: 'Confirmadas', color: '#0ea5e9' },
  { key: 'pending', label: 'Pendientes', color: '#6366f1' },
  { key: 'cancelled', label: 'Canceladas', color: '#f43f5e' },
  { key: 'no_show', label: 'No show', color: '#f59e0b' },
];

const CHANNEL_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#f43f5e', '#6366f1', '#14b8a6'];
const COMPACT_CURRENCY_FORMATTER = new Intl.NumberFormat('es-UY', {
  style: 'currency',
  currency: 'UYU',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatCompactCurrency(cents: number) {
  return COMPACT_CURRENCY_FORMATTER.format(cents / 100);
}

function sanitizePositiveNumber(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, numeric);
}

function getPillClassName(isActive: boolean) {
  if (isActive) {
    return 'border-white/70 bg-white/78 text-ink shadow-[0_14px_24px_-22px_rgba(56,189,248,0.34)] dark:border-transparent dark:bg-white/[0.06] dark:text-white';
  }

  return 'border-white/55 bg-white/40 text-slate/80 hover:bg-white/58 dark:border-transparent dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.05]';
}

function shortenStaffName(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return 'Sin nombre';
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 12)}...`;
}

function useDarkThemeState() {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDarkTheme(root.classList.contains('dark'));

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDarkTheme;
}

function createBaseOptions(isDarkTheme: boolean): ApexOptions {
  const axisColor = isDarkTheme ? '#cbd5e1' : '#475569';

  return {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      foreColor: axisColor,
      animations: {
        enabled: true,
        speed: 380,
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: isDarkTheme ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.22)',
      strokeDashArray: 3,
    },
    legend: {
      labels: { colors: axisColor },
    },
    tooltip: {
      theme: isDarkTheme ? 'dark' : 'light',
    },
  };
}

export function MetricsApexOverview({
  metrics,
  selectedStaffId,
  selectedStaffName,
  staffComparison,
}: MetricsApexOverviewProps) {
  const isDarkTheme = useDarkThemeState();
  const baseOptions = useMemo(() => createBaseOptions(isDarkTheme), [isDarkTheme]);
  const axisColor = isDarkTheme ? '#cbd5e1' : '#475569';
  const [areaView, setAreaView] = useState<AreaViewKey>('REVENUE');
  const [pieView, setPieView] = useState<PieViewKey>('STATUS');
  const isStaffFocused = Boolean(selectedStaffId);
  const areaViewOptions = useMemo(
    () => (isStaffFocused ? AREA_VIEW_OPTIONS_STAFF_FOCUS : AREA_VIEW_OPTIONS),
    [isStaffFocused],
  );
  const normalizedStaffComparison = useMemo(
    () =>
      staffComparison.map((item) => ({
        staffId: String(item.staffId || '').trim(),
        staffName: String(item.staffName || '').trim() || 'Sin nombre',
        totalRevenueCents: Number.isFinite(item.totalRevenueCents)
          ? Math.max(0, Math.round(item.totalRevenueCents))
          : 0,
        completedAppointments: Number.isFinite(item.completedAppointments)
          ? Math.max(0, Math.round(item.completedAppointments))
          : 0,
        trustedRating: Number.isFinite(item.trustedRating)
          ? Math.min(5, Math.max(0, Number(item.trustedRating.toFixed(2))))
          : 0,
      })),
    [staffComparison],
  );
  const effectiveStaffRevenueComparison = normalizedStaffComparison;
  const effectiveStaffRatingComparison = normalizedStaffComparison;
  const dailyAreaSeries = useMemo(() => {
    const resolve = (selector: (item: DashboardMetrics['dailySeries'][number]) => number) => {
      const realData = metrics.dailySeries.map((item) => Number(selector(item) || 0));
      return {
        categories: metrics.dailySeries.map((item) => item.label),
        data: realData,
        usingMock: false,
      };
    };

    return {
      revenue: resolve((item) => item.revenueCents),
      totalBookings: resolve((item) => item.appointments),
      onlineBookings: resolve((item) => item.onlineAppointments),
      walkInBookings: resolve((item) => item.walkInAppointments),
    };
  }, [metrics.dailySeries]);
  const ratingAreaSeries = useMemo(() => {
    const realData = metrics.dailyRatingSeries.map((item) => Number(item.averageRating.toFixed(2)));
    return {
      categories: metrics.dailyRatingSeries.map((item) => item.label),
      data: realData,
      usingMock: false,
    };
  }, [metrics.dailyRatingSeries]);
  const handleAreaViewChange = useCallback((nextView: AreaViewKey) => {
    setAreaView((currentView) => (currentView === nextView ? currentView : nextView));
  }, []);
  const handlePieViewChange = useCallback((nextView: PieViewKey) => {
    setPieView((currentView) => (currentView === nextView ? currentView : nextView));
  }, []);

  useEffect(() => {
    if (!isStaffFocused) {
      return;
    }

    if (areaView === 'STAFF_REVENUE' || areaView === 'STAFF_RATING') {
      setAreaView('REVENUE');
    }
  }, [areaView, isStaffFocused]);

  const areaDefinition = useMemo(() => {
    if (areaView === 'SHOP_RATING') {
      return {
        title: isStaffFocused ? 'Calificacion del barbero' : 'Calificacion general',
        subtitle: isStaffFocused
          ? `Promedio diario de rating de ${selectedStaffName || 'este barbero'}.`
          : 'Promedio diario de rating de la barberia.',
        chartType: 'area' as const,
        categories: ratingAreaSeries.categories,
        seriesName: isStaffFocused ? 'Calificacion del barbero' : 'Calificacion general',
        data: ratingAreaSeries.data,
        color: '#8b5cf6',
        usingMock: ratingAreaSeries.usingMock,
        valueFormatter: (value: number) => `${Number(value || 0).toFixed(1)} puntos`,
        axisFormatter: (value: number) => `${Number(value || 0).toFixed(1)}`,
      };
    }

    if (areaView === 'STAFF_RATING') {
      return {
        title: 'Calificacion por barbero',
        subtitle: 'Comparacion visual de rating entre barberos.',
        chartType: 'bar' as const,
        categories: effectiveStaffRatingComparison.map((item) => shortenStaffName(item.staffName)),
        seriesName: 'Calificacion',
        data: effectiveStaffRatingComparison.map((item) => Number(item.trustedRating.toFixed(2))),
        color: '#8b5cf6',
        usingMock: false,
        valueFormatter: (value: number) => `${Number(value || 0).toFixed(1)} puntos`,
        axisFormatter: (value: number) => `${Number(value || 0).toFixed(1)}`,
      };
    }

    if (areaView === 'STAFF_REVENUE') {
      return {
        title: 'Comparacion de barberos',
        subtitle: 'Rendimiento por facturacion de cada barbero en el periodo.',
        chartType: 'bar' as const,
        categories: effectiveStaffRevenueComparison.map((item) => shortenStaffName(item.staffName)),
        seriesName: 'Facturacion por barbero',
        data: effectiveStaffRevenueComparison.map((item) => item.totalRevenueCents),
        color: '#d946ef',
        usingMock: false,
        valueFormatter: (value: number) => formatCurrency(value),
        axisFormatter: (value: number) => formatCompactCurrency(value),
      };
    }

    if (areaView === 'TOTAL_BOOKINGS') {
      return {
        title: 'Reservas reales',
        subtitle: 'Total combinado de web + presencial por fecha.',
        chartType: 'area' as const,
        categories: dailyAreaSeries.totalBookings.categories,
        seriesName: 'Reservas',
        data: dailyAreaSeries.totalBookings.data,
        color: '#38bdf8',
        usingMock: dailyAreaSeries.totalBookings.usingMock,
        valueFormatter: (value: number) => `${Math.round(value)} reservas`,
        axisFormatter: (value: number) => `${Math.round(value)}`,
      };
    }

    if (areaView === 'ONLINE_BOOKINGS') {
      return {
        title: 'Reservas online',
        subtitle: 'Canal web por fecha.',
        chartType: 'area' as const,
        categories: dailyAreaSeries.onlineBookings.categories,
        seriesName: 'Solo web',
        data: dailyAreaSeries.onlineBookings.data,
        color: '#0ea5e9',
        usingMock: dailyAreaSeries.onlineBookings.usingMock,
        valueFormatter: (value: number) => `${Math.round(value)} reservas`,
        axisFormatter: (value: number) => `${Math.round(value)}`,
      };
    }

    if (areaView === 'WALK_IN_BOOKINGS') {
      return {
        title: 'Reservas presenciales',
        subtitle: 'Walk-ins + carga manual por fecha.',
        chartType: 'area' as const,
        categories: dailyAreaSeries.walkInBookings.categories,
        seriesName: 'Solo presencial',
        data: dailyAreaSeries.walkInBookings.data,
        color: '#14b8a6',
        usingMock: dailyAreaSeries.walkInBookings.usingMock,
        valueFormatter: (value: number) => `${Math.round(value)} reservas`,
        axisFormatter: (value: number) => `${Math.round(value)}`,
      };
    }

    return {
      title: 'Facturacion en el tiempo',
      subtitle: 'Vista principal del negocio para control diario.',
      chartType: 'area' as const,
      categories: dailyAreaSeries.revenue.categories,
      seriesName: 'Facturacion',
      data: dailyAreaSeries.revenue.data,
      color: '#f59e0b',
      usingMock: dailyAreaSeries.revenue.usingMock,
      valueFormatter: (value: number) => formatCurrency(value),
      axisFormatter: (value: number) => formatCompactCurrency(value),
    };
  }, [
    areaView,
    dailyAreaSeries,
    ratingAreaSeries,
    effectiveStaffRevenueComparison,
    effectiveStaffRatingComparison,
    isStaffFocused,
    selectedStaffName,
  ]);

  const normalizedArea = useMemo(() => {
    const categories = [...areaDefinition.categories];
    const data = areaDefinition.data.map((value) => (Number.isFinite(value) ? Number(value) : 0));

    if (data.length === 0) {
      return {
        categories: ['Sin datos', 'Sin datos'],
        data: [0, 0],
      };
    }

    if (data.length === 1) {
      categories.push(categories[0] || 'Actual');
      data.push(data[0] || 0);
    }

    return {
      categories,
      data,
    };
  }, [areaDefinition.categories, areaDefinition.data]);
  const isRatingScale = areaView === 'SHOP_RATING' || areaView === 'STAFF_RATING';
  const flatAreaStats = useMemo(() => {
    if (!normalizedArea.data.length) {
      return {
        isFlat: true,
        flatValue: 0,
      };
    }

    const flatValue = normalizedArea.data[0] || 0;
    const isFlat = normalizedArea.data.every((value) => value === flatValue);

    return {
      isFlat,
      flatValue,
    };
  }, [normalizedArea.data]);
  const hasOnlyZeroAreaValues =
    !isRatingScale && flatAreaStats.isFlat && flatAreaStats.flatValue === 0;
  const shouldShowAreaEmptyState =
    areaDefinition.chartType === 'area' && hasOnlyZeroAreaValues && !areaDefinition.usingMock;
  const chartCategories = useMemo(() => {
    if (areaDefinition.chartType === 'bar') {
      return normalizedArea.categories;
    }

    const total = normalizedArea.categories.length;
    if (total <= 10) {
      return normalizedArea.categories;
    }

    const step = Math.max(1, Math.ceil(total / 7));
    return normalizedArea.categories.map((label, index) =>
      index % step === 0 || index === total - 1 ? label : '',
    );
  }, [areaDefinition.chartType, normalizedArea.categories]);

  const areaOptions = useMemo<ApexOptions>(() => {
    const isBar = areaDefinition.chartType === 'bar';
    const isCurrencyScale = areaView === 'REVENUE' || areaView === 'STAFF_REVENUE';
    const flatPadding = Math.max(Math.abs(flatAreaStats.flatValue) * 0.2, 1);

    return {
      ...baseOptions,
      chart: {
        ...baseOptions.chart,
        type: areaDefinition.chartType,
      },
      colors: [areaDefinition.color],
      stroke: {
        curve: isBar ? 'straight' : 'smooth',
        width: isBar ? 0 : 3,
      },
      ...(isBar
        ? {
            fill: {
              type: 'solid',
              opacity: 0.9,
            },
          }
        : {
            fill: {
              type: 'gradient',
              gradient: {
                shadeIntensity: 0.45,
                opacityFrom: 0.45,
                opacityTo: 0.07,
                stops: [0, 100],
              },
            },
          }),
      legend: {
        ...baseOptions.legend,
        show: false,
      },
      markers: {
        size: isBar ? 0 : 3,
        strokeWidth: 0,
      },
      ...(isBar
        ? {
            plotOptions: {
              bar: {
                borderRadius: 10,
                columnWidth: '52%',
                distributed: false,
              },
            },
          }
        : {}),
      xaxis: {
        categories: chartCategories,
        labels: {
          style: {
            colors: axisColor,
            fontSize: '11px',
          },
          rotate: isBar ? 0 : -20,
        },
      },
      yaxis: {
        ...(isRatingScale
          ? {
              min: 0,
              max: 5,
            }
          : !isBar && flatAreaStats.isFlat
            ? {
                min:
                  flatAreaStats.flatValue === 0
                    ? 0
                    : Math.max(0, flatAreaStats.flatValue - flatPadding),
                max:
                  flatAreaStats.flatValue === 0
                    ? isCurrencyScale
                      ? 100
                      : 1
                    : flatAreaStats.flatValue + flatPadding,
                ...(hasOnlyZeroAreaValues
                  ? {
                      tickAmount: 1,
                    }
                  : {}),
              }
            : {}),
        labels: {
          show: !hasOnlyZeroAreaValues,
          style: {
            colors: axisColor,
            fontSize: '11px',
          },
          formatter: (value: string | number) => areaDefinition.axisFormatter(Number(value) || 0),
        },
      },
      tooltip: {
        ...baseOptions.tooltip,
        y: {
          formatter: (value: string | number) => areaDefinition.valueFormatter(Number(value) || 0),
        },
      },
    };
  }, [
    areaDefinition,
    areaView,
    chartCategories,
    isRatingScale,
    flatAreaStats,
    hasOnlyZeroAreaValues,
    axisColor,
    baseOptions,
  ]);

  const areaSeries = useMemo(
    () => [
      {
        name: areaDefinition.seriesName,
        data: normalizedArea.data,
      },
    ],
    [normalizedArea.data, areaDefinition.seriesName],
  );

  const statusBreakdown = useMemo(() => {
    const real = STATUS_DEFINITIONS.map((item) => ({
      label: item.label,
      color: item.color,
      value: sanitizePositiveNumber(metrics.countsByStatus[item.key]),
    })).filter((item) => item.value > 0);
    return {
      items: real,
      usingMock: false,
    };
  }, [metrics.countsByStatus]);
  const channelBreakdown = useMemo(() => {
    const real = metrics.channelMix
      .map((item, index) => ({
        label: String(item.label || '').trim() || `Canal ${index + 1}`,
        color: CHANNEL_COLORS[index % CHANNEL_COLORS.length] || '#0ea5e9',
        value: sanitizePositiveNumber(item.appointments),
      }))
      .filter((item) => item.value > 0);
    return {
      items: real,
      usingMock: false,
    };
  }, [metrics.channelMix]);
  const pieData = useMemo(() => {
    const selectedBreakdown = pieView === 'STATUS' ? statusBreakdown : channelBreakdown;
    const safeItems = selectedBreakdown.items.map((item) => ({
      ...item,
      label: String(item.label || '').trim() || 'Sin etiqueta',
      value: sanitizePositiveNumber(item.value),
    }));
    const pieItems = safeItems.filter((item) => item.value > 0);
    const pieSeries = pieItems.map((item) => sanitizePositiveNumber(item.value));
    const pieTotal = pieSeries.reduce((sum, value) => sum + value, 0);
    const pieWithShare = pieItems.map((item) => ({
      ...item,
      share: pieTotal > 0 ? item.value / pieTotal : 0,
    }));

    return {
      pieItems,
      pieSeries,
      pieTotal,
      pieWithShare,
      usingPieMock: false,
    };
  }, [channelBreakdown, pieView, statusBreakdown]);
  const { pieItems, pieSeries, pieTotal, pieWithShare } = pieData;
  const shouldShowPieEmptyState = pieSeries.length === 0 || pieSeries.every((value) => value <= 0);

  const pieOptions = useMemo<ApexOptions>(() => {
    return {
      ...baseOptions,
      chart: {
        ...baseOptions.chart,
        type: 'donut',
      },
      labels: pieItems.map((item) => item.label),
      colors: pieItems.map((item) => item.color),
      stroke: {
        width: 0,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.5,
          opacityFrom: 0.95,
          opacityTo: 0.72,
          stops: [0, 90, 100],
        },
      },
      legend: {
        ...baseOptions.legend,
        show: false,
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              value: {
                show: true,
                color: axisColor,
                formatter: (value: string) => `${Math.round(Number(value) || 0)}`,
              },
              total: {
                show: true,
                label: pieView === 'STATUS' ? 'Vista' : 'Canales',
                color: axisColor,
                formatter: () => `${pieTotal}`,
              },
            },
          },
        },
      },
      tooltip: {
        ...baseOptions.tooltip,
        y: {
          formatter: (value: string | number, opts: { seriesIndex: number }) => {
            const row = pieWithShare[opts.seriesIndex];
            const numericValue = Number(value) || 0;

            if (!row) {
              return `${numericValue}`;
            }

            return `${numericValue} reservas (${formatPercent(row.share)})`;
          },
        },
      },
    };
  }, [axisColor, baseOptions, pieItems, pieTotal, pieView, pieWithShare]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="spotlight-card soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="space-y-4 p-5">
          <div className="space-y-2">
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink dark:text-slate-100">
              {areaDefinition.title}
            </h2>
            <p className="text-sm text-slate/80 dark:text-slate-300">{areaDefinition.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {areaViewOptions.map((option) => (
              <Button
                key={option.key}
                type="button"
                size="sm"
                radius="lg"
                variant="light"
                className={`rounded-2xl border px-4 py-2 text-xs font-semibold transition ${getPillClassName(
                  areaView === option.key,
                )}`}
                onClick={() => handleAreaViewChange(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {shouldShowAreaEmptyState ? (
            <div className="flex h-[320px] items-center justify-center rounded-[1.3rem] border border-dashed border-white/20 bg-white/[0.01] text-center">
              <div className="px-6">
                <p className="text-sm font-semibold text-slate-200">
                  Sin movimiento en este periodo
                </p>
                <p className="mt-2 text-xs text-slate/70 dark:text-slate-400">
                  Cambia el canal, barbero o rango para ver tendencia en esta vista.
                </p>
              </div>
            </div>
          ) : (
            <ApexChart
              options={areaOptions}
              series={areaSeries}
              type={areaDefinition.chartType}
              height={320}
            />
          )}
        </CardBody>
      </Card>

      <Card className="spotlight-card soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="space-y-4 p-5">
          <div className="space-y-2">
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-ink dark:text-slate-100">
              Distribucion
            </h2>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Estados y origen de reservas dentro del periodo seleccionado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              radius="lg"
              variant="light"
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold transition ${getPillClassName(
                pieView === 'STATUS',
              )}`}
              onClick={() => handlePieViewChange('STATUS')}
            >
              Estados
            </Button>
            <Button
              type="button"
              size="sm"
              radius="lg"
              variant="light"
              className={`rounded-2xl border px-4 py-2 text-xs font-semibold transition ${getPillClassName(
                pieView === 'CHANNEL',
              )}`}
              onClick={() => handlePieViewChange('CHANNEL')}
            >
              Canales
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-center">
            <div className="space-y-2">
              {pieWithShare.map((item) => (
                <div key={`legend-${item.label}`} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />
                  <p className="text-sm text-slate/85 dark:text-slate-200">{item.label}</p>
                </div>
              ))}
            </div>
            {shouldShowPieEmptyState ? (
              <div className="flex h-[320px] items-center justify-center rounded-[1.3rem] border border-dashed border-white/20 bg-white/[0.01] text-center">
                <div className="px-6">
                  <p className="text-sm font-semibold text-slate-200">Sin datos en este periodo</p>
                  <p className="mt-2 text-xs text-slate/70 dark:text-slate-400">
                    Ajusta canal, barbero o rango para ver la distribucion.
                  </p>
                </div>
              </div>
            ) : (
              <ApexChart options={pieOptions} series={pieSeries} type="donut" height={320} />
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {pieWithShare.map((item) => (
              <div key={item.label} className="data-card rounded-2xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">
                    {formatPercent(item.share)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate/75 dark:text-slate-300">
                  {item.value} reservas
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
