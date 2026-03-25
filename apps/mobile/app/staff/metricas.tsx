import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Card,
  Chip,
  ErrorText,
  MutedText,
  PillToggle,
  Screen,
  StatTile,
} from '../../components/ui/primitives';
import { getStaffContext } from '../../lib/auth';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { getStaffPerformanceDetail, type MetricRange, type StaffPerformanceDetail } from '../../lib/metrics';
import { useNavajaTheme } from '../../lib/theme';

const RANGE_OPTIONS: { key: MetricRange; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'last7', label: 'Ultimos 7 dias' },
  { key: 'month', label: 'Este mes' },
];

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function StaffMetricasScreen() {
  const { colors } = useNavajaTheme();
  const [selectedRange, setSelectedRange] = useState<MetricRange>('last7');
  const [performance, setPerformance] = useState<StaffPerformanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (range: MetricRange) => {
    setLoading(true);
    setError(null);

    const staff = await getStaffContext();
    if (!staff || !staff.staffId) {
      setLoading(false);
      setError('Sin sesion de staff activa.');
      return;
    }

    try {
      const result = await getStaffPerformanceDetail(staff.staffId, range, staff.shopId);
      setPerformance(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error cargando metricas.');
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData(selectedRange);
    }, [loadData, selectedRange]),
  );

  function changeRange(range: MetricRange) {
    setSelectedRange(range);
    void loadData(range);
  }

  const metric = performance?.metric;

  return (
    <Screen
      eyebrow="Staff"
      title="Mis metricas"
      subtitle="Lectura exclusiva de tu rendimiento personal."
    >
      <Card elevated>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Metricas personales</Text>
            <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
              Solo tu produccion individual. Sin comparativas del equipo.
            </Text>
          </View>
          {metric ? (
            <Chip
              label={metric.healthLabel}
              tone={metric.healthTone === 'success' ? 'success' : metric.healthTone === 'danger' ? 'danger' : 'warning'}
            />
          ) : null}
        </View>

        <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map((option) => (
            <PillToggle
              key={option.key}
              label={option.label}
              active={selectedRange === option.key}
              onPress={() => changeRange(option.key)}
              compact
            />
          ))}
        </View>

        {performance ? (
          <Text style={[styles.rangeLabel, { color: colors.textMuted }]}>
            Periodo: {performance.rangeLabel}
          </Text>
        ) : null}
      </Card>

      {loading ? (
        <Card elevated>
          <MutedText>Cargando metricas...</MutedText>
        </Card>
      ) : null}

      {!loading && !metric ? (
        <Card elevated>
          <MutedText>
            Todavia no hay suficientes datos para mostrar tus metricas en este periodo.
          </MutedText>
        </Card>
      ) : null}

      {metric ? (
        <>
          <View style={styles.kpiRow}>
            <StatTile
              label="Facturacion"
              value={formatCurrency(metric.totalRevenueCents)}
              style={styles.kpiTile}
            />
            <StatTile
              label="Ticket promedio"
              value={formatCurrency(metric.averageTicketCents)}
              style={styles.kpiTile}
            />
          </View>
          <View style={styles.kpiRow}>
            <StatTile
              label="Ocupacion"
              value={`${Math.round(metric.occupancyRatio * 100)}%`}
              style={styles.kpiTile}
            />
            <StatTile
              label="Horas reservadas"
              value={formatHours(metric.bookedMinutes)}
              style={styles.kpiTile}
            />
          </View>

          <Card elevated>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Salud del desempeno</Text>
            <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
              Indicadores clave de calidad, recurrencia y estabilidad.
            </Text>
            <View style={styles.healthGrid}>
              <HealthTile
                label="Citas realizadas"
                value={String(metric.completedAppointments)}
                colors={colors}
              />
              <HealthTile
                label="Clientes recurrentes"
                value={`${Math.round(metric.repeatClientRate * 100)}%`}
                colors={colors}
              />
              <HealthTile
                label="Cancelaciones"
                value={`${Math.round(metric.cancellationRate * 100)}%`}
                colors={colors}
              />
              <HealthTile
                label="No show"
                value={String(metric.noShowAppointments)}
                colors={colors}
              />
            </View>

            {performance?.insights && performance.insights.length > 0 ? (
              <View style={[styles.insightBox, { borderColor: colors.border, backgroundColor: colors.panel }]}>
                <Text style={[styles.insightLabel, { color: colors.textMuted }]}>Insights</Text>
                {performance.insights.map((insight) => (
                  <Text key={insight} style={[styles.insightText, { color: colors.textMuted }]}>
                    {insight}
                  </Text>
                ))}
              </View>
            ) : null}
          </Card>

          {performance?.recentReviews && performance.recentReviews.length > 0 ? (
            <Card elevated>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Resenas recientes</Text>
              <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
                Feedback publicado dentro del periodo seleccionado.
              </Text>
              <View style={styles.list}>
                {performance.recentReviews.map((review) => (
                  <View
                    key={review.id}
                    style={[styles.reviewCard, { borderColor: colors.border, backgroundColor: colors.panel }]}
                  >
                    <View style={styles.reviewRow}>
                      <Text style={[styles.reviewCustomer, { color: colors.text }]}>
                        {review.customerName}
                      </Text>
                      <Chip label={`${review.rating}/5`} tone={review.rating >= 4 ? 'success' : review.rating >= 3 ? 'warning' : 'danger'} />
                    </View>
                    <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                      {formatDateTime(review.submittedAt)}
                    </Text>
                    {review.comment ? (
                      <Text style={[styles.reviewComment, { color: colors.textMuted }]}>
                        {review.comment}
                      </Text>
                    ) : (
                      <Text style={[styles.reviewComment, { color: colors.textMuted }]}>
                        Sin comentario adicional.
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
        </>
      ) : null}

      <ErrorText message={error} />
    </Screen>
  );
}

function HealthTile({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useNavajaTheme>['colors'];
}) {
  return (
    <View style={[styles.healthTile, { borderColor: colors.border, backgroundColor: colors.panel }]}>
      <Text style={[styles.healthLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.healthValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiTile: {
    flex: 1,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthTile: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    minWidth: '45%',
    flex: 1,
    gap: 6,
  },
  healthLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  healthValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  insightBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: 8,
  },
  reviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  reviewCustomer: {
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  reviewDate: {
    fontSize: 11,
    opacity: 0.7,
  },
  reviewComment: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});
