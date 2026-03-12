import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  AnalyticsAreaChart,
  AnalyticsBarRow,
  AnalyticsFilterBar,
  AnalyticsLineItem,
  AnalyticsMetricCard,
  AnalyticsSectionTitle,
} from '../../../components/admin/analytics-ui';
import {
  Card,
  Chip,
  HeroPanel,
  MutedText,
  Screen,
  StatTile,
  SurfaceCard,
} from '../../../components/ui/primitives';
import { getAuthContext } from '../../../lib/auth';
import { formatCurrency } from '../../../lib/format';
import {
  getStaffPerformanceDetail,
  type MetricRange,
  type StaffPerformanceDetail,
} from '../../../lib/metrics';
import { useNavajaTheme } from '../../../lib/theme';

const rangeOptions: Array<{ label: string; value: MetricRange }> = [
  { label: 'Hoy', value: 'today' },
  { label: 'Ultimos 7 dias', value: 'last7' },
  { label: 'Este mes', value: 'month' },
];

function normalizeRange(value: string | undefined): MetricRange {
  if (value === 'today' || value === 'last7' || value === 'month') {
    return value;
  }
  return 'today';
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} h`;
}

function formatReviewPeriod(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('es-UY', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function AdminStaffPerformanceScreen() {
  const { colors } = useNavajaTheme();
  const params = useLocalSearchParams<{ staffId?: string; range?: string }>();
  const staffId = String(params.staffId || '');

  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<MetricRange>(normalizeRange(params.range));
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [detail, setDetail] = useState<StaffPerformanceDetail | null>(null);

  const maxTrendValue = useMemo(() => {
    if (!detail?.ratingTrend?.length) {
      return 5;
    }
    return Math.max(5, ...detail.ratingTrend.map((item) => item.averageRating));
  }, [detail?.ratingTrend]);

  const ratingTrendChartData = useMemo(
    () =>
      (detail?.ratingTrend || []).map((item) => ({
        label: formatReviewPeriod(item.periodStart),
        value: item.averageRating,
      })),
    [detail?.ratingTrend],
  );

  const loadData = useCallback(async () => {
    if (!staffId) {
      setError('No se recibio un barbero valido.');
      setLoading(false);
      return;
    }

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
      const result = await getStaffPerformanceDetail(staffId, range, auth.shopId);
      if (!result) {
        setDetail(null);
        setError('No se encontro informacion para este perfil.');
      } else {
        setDetail(result);
      }
    } catch {
      setDetail(null);
      setError('No se pudo cargar el detalle de performance.');
    }

    setLoading(false);
  }, [range, staffId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  if (!allowed && !loading) {
    return (
      <Screen title="Performance" subtitle="Acceso restringido">
        <Card>
          <Text style={[styles.warningText, { color: colors.danger }]}>
            No tienes permisos de admin.
          </Text>
        </Card>
      </Screen>
    );
  }

  const metric = detail?.metric || null;

  return (
    <Screen
      eyebrow="Admin"
      title={metric?.staffName || 'Performance'}
      subtitle={
        workspaceName
          ? `${detail?.rangeLabel || 'Detalle por barbero'} - ${workspaceName}`
          : (detail?.rangeLabel || 'Detalle por barbero')
      }
    >
      <HeroPanel
        eyebrow="Staff"
        title={metric?.staffName || 'Detalle individual'}
        description="Mobile replica la lectura ejecutiva de web con foco en revenue, calidad de servicio, retencion y tendencia de resenas."
      >
        <View style={styles.heroStats}>
          <StatTile
            label="Facturacion"
            value={metric ? formatCurrency(metric.totalRevenueCents) : '--'}
          />
          <StatTile
            label="Ocupacion"
            value={metric ? formatPercent(metric.occupancyRatio) : '--'}
          />
          <StatTile
            label="Resena"
            value={
              metric ? `${metric.trustedRating.toFixed(1)} (${metric.reviewCount})` : '--'
            }
          />
        </View>
      </HeroPanel>

      <Card elevated>
        <AnalyticsSectionTitle>Filtro temporal</AnalyticsSectionTitle>
        <AnalyticsFilterBar
          label="Rango"
          options={rangeOptions}
          value={range}
          onChange={setRange}
        />
      </Card>

      {loading ? (
        <Card>
          <MutedText>Cargando performance...</MutedText>
        </Card>
      ) : null}
      {error ? (
        <Card>
          <Text style={[styles.warningText, { color: colors.danger }]}>{error}</Text>
        </Card>
      ) : null}

      {metric ? (
        <>
          <Card elevated>
            <AnalyticsSectionTitle>KPIs del barbero</AnalyticsSectionTitle>
            <View style={styles.metricGrid}>
              <AnalyticsMetricCard
                label="Facturacion"
                value={formatCurrency(metric.totalRevenueCents)}
                hint={`${metric.completedAppointments} citas realizadas`}
                tone="accent"
              />
              <AnalyticsMetricCard
                label="Facturacion / hora"
                value={formatCurrency(metric.revenuePerAvailableHourCents)}
                hint={`${formatHours(metric.availableMinutes)} disponibles`}
                tone="focus"
              />
              <AnalyticsMetricCard
                label="Ocupacion"
                value={formatPercent(metric.occupancyRatio)}
                hint={`${formatHours(metric.bookedMinutes)} reservadas`}
                tone="success"
              />
              <AnalyticsMetricCard
                label="Ticket promedio"
                value={formatCurrency(metric.averageTicketCents)}
                hint="Ingreso medio por cita"
                tone="primary"
              />
              <AnalyticsMetricCard
                label="Resena confiable"
                value={`${metric.trustedRating.toFixed(1)} (${metric.reviewCount})`}
                hint={`Promedio bruto ${metric.averageRating.toFixed(1)}`}
                tone="warning"
              />
              <AnalyticsMetricCard
                label="Recompra"
                value={formatPercent(metric.repeatClientRate)}
                hint={`${metric.repeatCustomers} clientes recurrentes`}
                tone="focus"
              />
            </View>
          </Card>

          <Card elevated>
            <AnalyticsSectionTitle>Lectura operativa</AnalyticsSectionTitle>
            <View style={styles.dualSectionGrid}>
              <SurfaceCard style={styles.dualSectionCard} contentStyle={styles.dualSectionContent}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Productividad</Text>
                <View style={styles.list}>
                  <AnalyticsLineItem
                    label="Horas disponibles"
                    value={formatHours(metric.availableMinutes)}
                  />
                  <AnalyticsLineItem
                    label="Horas reservadas"
                    value={formatHours(metric.bookedMinutes)}
                  />
                  <AnalyticsLineItem
                    label="Horas atendidas"
                    value={formatHours(metric.serviceMinutes)}
                  />
                  <AnalyticsLineItem
                    label="Realizadas"
                    value={String(metric.completedAppointments)}
                  />
                </View>
              </SurfaceCard>

              <SurfaceCard style={styles.dualSectionCard} contentStyle={styles.dualSectionContent}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Confiabilidad</Text>
                <View style={styles.list}>
                  <AnalyticsLineItem
                    label="Canceladas por equipo"
                    value={String(metric.staffCancellations)}
                  />
                  <AnalyticsLineItem
                    label="Canceladas por cliente"
                    value={String(metric.customerCancellations)}
                  />
                  <AnalyticsLineItem
                    label="No show"
                    value={String(metric.noShowAppointments)}
                  />
                  <AnalyticsLineItem
                    label="Tasa de cancelacion"
                    value={formatPercent(metric.cancellationRate)}
                  />
                </View>
              </SurfaceCard>

              <SurfaceCard style={styles.dualSectionCard} contentStyle={styles.dualSectionContent}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Clientes</Text>
                <View style={styles.list}>
                  <AnalyticsLineItem
                    label="Clientes unicos"
                    value={String(metric.uniqueCustomers)}
                  />
                  <AnalyticsLineItem
                    label="Clientes repetidos"
                    value={String(metric.repeatCustomers)}
                  />
                  <AnalyticsLineItem
                    label="Resenas"
                    value={String(metric.reviewCount)}
                  />
                  <AnalyticsLineItem
                    label="Promedio bruto"
                    value={metric.averageRating.toFixed(1)}
                  />
                </View>
              </SurfaceCard>
            </View>
          </Card>

          <Card elevated>
            <AnalyticsSectionTitle>Tendencia de resenas</AnalyticsSectionTitle>
            {detail?.ratingTrend.length ? (
              <>
                <AnalyticsAreaChart
                  data={ratingTrendChartData}
                  maxValue={maxTrendValue}
                  tone="focus"
                />
                <View style={styles.list}>
                  {detail.ratingTrend.map((item) => (
                    <AnalyticsBarRow
                      key={item.periodStart}
                      label={formatReviewPeriod(item.periodStart)}
                      valueLabel={`${item.averageRating.toFixed(1)} (${item.reviewCount})`}
                      widthPercent={(item.averageRating / maxTrendValue) * 100}
                      hint={`${item.reviewCount} resenas publicadas`}
                      tone="focus"
                    />
                  ))}
                </View>
              </>
            ) : (
              <MutedText>Sin datos</MutedText>
            )}
          </Card>

          <Card elevated>
            <AnalyticsSectionTitle>Resenas recientes</AnalyticsSectionTitle>
            {detail?.recentReviews.length ? (
              <View style={styles.list}>
                {detail.recentReviews.map((review) => (
                  <SurfaceCard
                    key={review.id}
                    style={styles.reviewCard}
                    contentStyle={styles.reviewCardContent}
                  >
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewMetaBlock}>
                        <Text style={[styles.reviewName, { color: colors.text }]}>
                          {review.customerName}
                        </Text>
                        <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                          {new Date(review.submittedAt).toLocaleDateString('es-UY')}
                        </Text>
                      </View>
                      <Chip label={`${review.rating} / 5`} tone="warning" />
                    </View>
                    {review.comment ? (
                      <Text style={[styles.reviewComment, { color: colors.textSoft }]}>
                        {review.comment}
                      </Text>
                    ) : (
                      <MutedText>Sin comentario textual.</MutedText>
                    )}
                  </SurfaceCard>
                ))}
              </View>
            ) : (
              <MutedText>No hay resenas publicadas en este rango.</MutedText>
            )}
          </Card>

          <Card elevated>
            <AnalyticsSectionTitle>Lectura rapida</AnalyticsSectionTitle>
            {detail?.insights.length ? (
              <View style={styles.list}>
                {detail.insights.map((item) => (
                  <SurfaceCard
                    key={item}
                    style={styles.insightCard}
                    contentStyle={styles.insightCardContent}
                  >
                    <Text style={[styles.insightText, { color: colors.textSoft }]}>{item}</Text>
                  </SurfaceCard>
                ))}
              </View>
            ) : (
              <MutedText>Sin insights para este rango.</MutedText>
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
  reviewCard: {
    padding: 0,
  },
  reviewCardContent: {
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  reviewMetaBlock: {
    flex: 1,
    gap: 2,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 18,
  },
  insightCard: {
    padding: 0,
  },
  insightCardContent: {
    gap: 0,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
