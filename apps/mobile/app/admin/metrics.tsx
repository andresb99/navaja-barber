import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  AnalyticsAreaChart,
  AnalyticsBarChart,
  AnalyticsBarRow,
  AnalyticsFilterBar,
  AnalyticsLineItem,
  AnalyticsMetricCard,
  AnalyticsPeakChip,
  AnalyticsSectionTitle,
} from '../../components/admin/analytics-ui';
import {
  Card,
  HeroPanel,
  MutedText,
  Screen,
  StatTile,
  SurfaceCard,
} from '../../components/ui/primitives';
import { getAuthContext } from '../../lib/auth';
import { formatCurrency } from '../../lib/format';
import {
  type BookingMetricsChannelView,
  type DashboardMetrics,
  getDashboardMetrics,
  type MetricRange,
} from '../../lib/metrics';
import { useNavajaTheme } from '../../lib/theme';

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistio',
  done: 'Realizada',
};

const rangeOptions: Array<{ label: string; value: MetricRange }> = [
  { label: 'Hoy', value: 'today' },
  { label: 'Ultimos 7 dias', value: 'last7' },
  { label: 'Este mes', value: 'month' },
];

const channelOptions: Array<{ label: string; value: BookingMetricsChannelView }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Solo online', value: 'ONLINE_ONLY' },
  { label: 'Solo presenciales', value: 'WALK_INS_ONLY' },
];

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function AdminMetricsScreen() {
  const { colors } = useNavajaTheme();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<MetricRange>('today');
  const [channelView, setChannelView] = useState<BookingMetricsChannelView>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const maxTopServices = useMemo(() => {
    if (!metrics?.topServices?.length) {
      return 1;
    }
    return Math.max(1, ...metrics.topServices.map((item) => item.count));
  }, [metrics]);

  const maxRevenueByStaff = useMemo(() => {
    if (!metrics?.revenueByStaff?.length) {
      return 1;
    }
    return Math.max(1, ...metrics.revenueByStaff.map((item) => item.revenue_cents));
  }, [metrics]);

  const maxDailyAppointments = useMemo(() => {
    if (!metrics?.dailySeries?.length) {
      return 1;
    }
    return Math.max(1, ...metrics.dailySeries.map((item) => item.appointments));
  }, [metrics]);

  const maxChannelMixAppointments = useMemo(() => {
    if (!metrics?.channelMix?.length) {
      return 1;
    }
    return Math.max(1, ...metrics.channelMix.map((item) => item.appointments));
  }, [metrics]);

  const channelMixChartData = useMemo(
    () =>
      (metrics?.channelMix || []).map((item) => ({
        label: item.label,
        value: item.appointments,
        color: item.channel === 'ONLINE' ? colors.focus : colors.accent,
      })),
    [colors.accent, colors.focus, metrics?.channelMix],
  );

  const dailySeriesChartData = useMemo(
    () =>
      (metrics?.dailySeries || []).map((item) => ({
        label: item.label,
        value: item.appointments,
      })),
    [metrics?.dailySeries],
  );

  const topServicesChartData = useMemo(
    () =>
      (metrics?.topServices || []).map((item) => ({
        label: item.service,
        value: item.count,
      })),
    [metrics?.topServices],
  );

  const revenueByStaffChartData = useMemo(
    () =>
      (metrics?.revenueByStaff || []).slice(0, 6).map((item) => ({
        label: item.staff,
        value: item.revenue_cents,
      })),
    [metrics?.revenueByStaff],
  );

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const auth = await getAuthContext();
    if (auth.role !== 'admin' || !auth.shopId) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    setAllowed(true);
    setWorkspaceName(auth.shopName || 'Barberia');

    try {
      const result = await getDashboardMetrics(range, channelView, auth.shopId);
      setMetrics(result);
    } catch {
      setMetrics(null);
      setError('No se pudieron cargar las metricas.');
    }

    setLoading(false);
  }, [channelView, range]);

  useFocusEffect(
    useCallback(() => {
      void loadMetrics();
    }, [loadMetrics]),
  );

  if (!allowed && !loading) {
    return (
      <Screen title="Metricas" subtitle="Acceso restringido">
        <Card>
          <Text style={[styles.warningText, { color: colors.danger }]}>
            No tienes permisos de admin.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow="Admin"
      title="Metricas"
      subtitle={
        workspaceName
          ? `${metrics?.rangeLabel || 'KPI operativos'} - ${workspaceName}`
          : (metrics?.rangeLabel || 'KPI operativos')
      }
    >
      <HeroPanel
        eyebrow="Operacion"
        title={workspaceName || 'Panel de metricas'}
        description="La vista mobile ahora sigue la misma jerarquia que web: resumen ejecutivo, filtros claros y desglose por canal, servicio y staff."
      >
        <View style={styles.heroStats}>
          <StatTile
            label="Facturacion"
            value={metrics ? formatCurrency(metrics.estimatedRevenueCents) : '--'}
          />
          <StatTile
            label="Reservas activas"
            value={metrics ? String(metrics.channelBreakdown.filteredAppointments) : '--'}
          />
          <StatTile
            label="Ocupacion"
            value={metrics ? `${Math.round(metrics.occupancyRatio * 100)}%` : '--'}
          />
        </View>
      </HeroPanel>

      <Card elevated>
        <AnalyticsSectionTitle>Filtros</AnalyticsSectionTitle>
        <AnalyticsFilterBar
          label="Rango"
          options={rangeOptions}
          value={range}
          onChange={setRange}
        />
        <AnalyticsFilterBar
          label="Canal"
          options={channelOptions}
          value={channelView}
          onChange={setChannelView}
        />
      </Card>

      {error ? (
        <Card>
          <Text style={[styles.warningText, { color: colors.danger }]}>{error}</Text>
        </Card>
      ) : null}
      {loading ? (
        <Card>
          <MutedText>Cargando metricas...</MutedText>
        </Card>
      ) : null}
      {!loading && !metrics ? (
        <Card>
          <MutedText>No hay informacion para este rango.</MutedText>
        </Card>
      ) : null}

      {metrics ? (
        <>
          <Card elevated>
            <AnalyticsSectionTitle>Resumen ejecutivo</AnalyticsSectionTitle>
            <View style={styles.metricGrid}>
              <AnalyticsMetricCard
                label="Total reservas"
                value={String(metrics.channelBreakdown.totalAppointments)}
                hint={`${metrics.channelBreakdown.filteredAppointments} en la vista activa`}
                tone="focus"
              />
              <AnalyticsMetricCard
                label="Facturacion"
                value={formatCurrency(metrics.estimatedRevenueCents)}
                hint="Solo citas realizadas"
                tone="accent"
              />
              <AnalyticsMetricCard
                label="Ticket promedio"
                value={formatCurrency(metrics.averageTicketCents)}
                hint="Ingreso medio por reserva"
                tone="success"
              />
              <AnalyticsMetricCard
                label="Ocupacion"
                value={formatPercent(metrics.occupancyRatio)}
                hint={`${(metrics.capacitySummary.idleMinutes / 60).toFixed(1)} h libres`}
                tone="warning"
              />
              <AnalyticsMetricCard
                label="Tasa completadas"
                value={formatPercent(metrics.statusSummary.completionRate)}
                hint={`${metrics.statusSummary.doneAppointments} citas realizadas`}
                tone="success"
              />
              <AnalyticsMetricCard
                label="Cancelaciones"
                value={formatPercent(metrics.statusSummary.cancellationRate)}
                hint={`${metrics.statusSummary.cancelledAppointments} citas canceladas`}
                tone="warning"
              />
            </View>
          </Card>

          <Card elevated>
            <AnalyticsSectionTitle>Canales y conversion</AnalyticsSectionTitle>
            <View style={styles.metricGrid}>
              <AnalyticsMetricCard
                label="Online"
                value={String(metrics.channelBreakdown.onlineAppointments)}
                hint={formatPercent(metrics.channelBreakdown.onlineShare)}
                tone="focus"
              />
              <AnalyticsMetricCard
                label="Presenciales"
                value={String(metrics.channelBreakdown.walkInAppointments)}
                hint={formatPercent(metrics.channelBreakdown.walkInShare)}
                tone="accent"
              />
              <AnalyticsMetricCard
                label="No show"
                value={formatPercent(metrics.statusSummary.noShowRate)}
                hint={`${metrics.statusSummary.noShowAppointments} citas`}
                tone="warning"
              />
              <AnalyticsMetricCard
                label="Cola activa"
                value={String(metrics.statusSummary.activeQueueAppointments)}
                hint={`${metrics.statusSummary.pendingAppointments} pendientes / ${metrics.statusSummary.confirmedAppointments} confirmadas`}
                tone="primary"
              />
            </View>
          </Card>

          <Card elevated>
            <AnalyticsSectionTitle>Operacion diaria</AnalyticsSectionTitle>

            <View style={styles.dualSectionGrid}>
              <SurfaceCard style={styles.dualSectionCard} contentStyle={styles.dualSectionContent}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Citas por estado</Text>
                <View style={styles.list}>
                  {Object.entries(metrics.countsByStatus).map(([status, count]) => (
                    <AnalyticsLineItem
                      key={status}
                      label={statusLabel[status] || status}
                      value={String(count)}
                    />
                  ))}
                </View>
              </SurfaceCard>

              <SurfaceCard style={styles.dualSectionCard} contentStyle={styles.dualSectionContent}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Flujo operativo</Text>
                <View style={styles.list}>
                  <AnalyticsLineItem
                    label="Pendientes / Confirmadas"
                    value={`${metrics.statusSummary.pendingAppointments} / ${metrics.statusSummary.confirmedAppointments}`}
                  />
                  <AnalyticsLineItem
                    label="Online del total"
                    value={formatPercent(metrics.channelBreakdown.onlineShare)}
                  />
                  <AnalyticsLineItem
                    label="Presencial del total"
                    value={formatPercent(metrics.channelBreakdown.walkInShare)}
                  />
                  <AnalyticsLineItem
                    label="Capacidad libre"
                    value={`${(metrics.capacitySummary.idleMinutes / 60).toFixed(1)} h`}
                  />
                </View>
              </SurfaceCard>
            </View>

            <Text style={[styles.subSectionTitle, { color: colors.text }]}>Horas pico</Text>
            {metrics.peakHours.length === 0 ? (
              <MutedText>Sin datos</MutedText>
            ) : (
              <View style={styles.chipWrap}>
                {metrics.peakHours.map((item) => (
                  <AnalyticsPeakChip
                    key={item.label}
                    label={item.label}
                    value={String(item.appointments)}
                  />
                ))}
              </View>
            )}
          </Card>

          <Card elevated>
            <AnalyticsSectionTitle>Canales de captacion</AnalyticsSectionTitle>
            {metrics.channelMix.length === 0 ? (
              <MutedText>Sin datos</MutedText>
            ) : (
              <>
                <AnalyticsBarChart
                  data={channelMixChartData}
                  maxValue={maxChannelMixAppointments}
                  tone="focus"
                />
                <View style={styles.list}>
                  {metrics.channelMix.map((item) => (
                    <AnalyticsBarRow
                      key={item.channel}
                      label={item.label}
                      valueLabel={`${item.appointments} (${formatPercent(item.share)})`}
                      widthPercent={(item.appointments / maxChannelMixAppointments) * 100}
                      hint={`Realizadas ${item.doneAppointments} - ${formatCurrency(item.revenueCents)}`}
                      tone={item.channel === 'ONLINE' ? 'focus' : 'accent'}
                    />
                  ))}
                </View>
              </>
            )}
          </Card>

          <Card elevated>
            <AnalyticsSectionTitle>Ritmo diario</AnalyticsSectionTitle>
            {metrics.dailySeries.length === 0 ? (
              <MutedText>Sin datos</MutedText>
            ) : (
              <>
                <AnalyticsAreaChart
                  data={dailySeriesChartData}
                  maxValue={maxDailyAppointments}
                  tone="success"
                />
                <View style={styles.list}>
                  {metrics.dailySeries.map((item) => (
                    <AnalyticsBarRow
                      key={item.date}
                      label={item.label}
                      valueLabel={`${item.appointments} - ${formatCurrency(item.revenueCents)}`}
                      widthPercent={(item.appointments / maxDailyAppointments) * 100}
                      hint={`Realizadas ${item.doneAppointments} - Online ${item.onlineAppointments} - Presenciales ${item.walkInAppointments}`}
                      tone="success"
                    />
                  ))}
                </View>
              </>
            )}
          </Card>

          <Card elevated>
            <AnalyticsSectionTitle>Servicios mas pedidos</AnalyticsSectionTitle>
            {metrics.topServices.length === 0 ? (
              <MutedText>Sin datos</MutedText>
            ) : (
              <>
                <AnalyticsBarChart
                  data={topServicesChartData}
                  maxValue={maxTopServices}
                  tone="accent"
                />
                <View style={styles.list}>
                  {metrics.topServices.map((item) => (
                    <AnalyticsBarRow
                      key={item.service}
                      label={item.service}
                      valueLabel={String(item.count)}
                      widthPercent={(item.count / maxTopServices) * 100}
                      tone="accent"
                    />
                  ))}
                </View>
              </>
            )}
          </Card>

          <Card elevated>
            <AnalyticsSectionTitle>Facturacion por staff</AnalyticsSectionTitle>
            {metrics.revenueByStaff.length === 0 ? (
              <MutedText>Sin datos</MutedText>
            ) : (
              <>
                <AnalyticsBarChart
                  data={revenueByStaffChartData}
                  maxValue={maxRevenueByStaff}
                  tone="focus"
                />
                <View style={styles.list}>
                  {metrics.revenueByStaff.map((item) => {
                    const canOpenDetail = item.staff_id !== 'unassigned';
                    const staffPressProps = canOpenDetail
                      ? {
                          active: true as const,
                          onPress: () =>
                            router.push({
                              pathname: '/admin/performance/[staffId]',
                              params: {
                                staffId: item.staff_id,
                                range,
                              },
                            }),
                        }
                      : {
                          active: false as const,
                        };

                    return (
                      <SurfaceCard
                        key={`${item.staff_id}-${item.staff}`}
                        style={styles.staffCard}
                        contentStyle={styles.staffCardContent}
                        {...staffPressProps}
                      >
                        <AnalyticsBarRow
                          label={item.staff}
                          valueLabel={formatCurrency(item.revenue_cents)}
                          widthPercent={(item.revenue_cents / maxRevenueByStaff) * 100}
                          hint={
                            canOpenDetail
                              ? 'Toca para abrir la performance individual.'
                              : 'Reserva sin staff asignado.'
                          }
                          tone="focus"
                        />
                        {canOpenDetail ? (
                          <Text style={[styles.staffLink, { color: colors.textAccent }]}>
                            Abrir detalle
                          </Text>
                        ) : null}
                      </SurfaceCard>
                    );
                  })}
                </View>
              </>
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroStats: {
    flexDirection: 'row',
    gap: 8,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dualSectionGrid: {
    gap: 10,
  },
  dualSectionCard: {
    padding: 0,
  },
  dualSectionContent: {
    gap: 10,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  list: {
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  staffCard: {
    padding: 0,
  },
  staffCardContent: {
    gap: 8,
  },
  staffLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
