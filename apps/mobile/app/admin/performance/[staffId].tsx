import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Card, MutedText, Screen } from '../../../components/ui/primitives';
import { getAuthContext } from '../../../lib/auth';
import { formatCurrency } from '../../../lib/format';
import {
  getStaffPerformanceDetail,
  type MetricRange,
  type StaffPerformanceDetail,
} from '../../../lib/metrics';
import { palette } from '../../../lib/theme';

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

export default function AdminStaffPerformanceScreen() {
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
          <Text style={styles.error}>No tienes permisos de admin.</Text>
        </Card>
      </Screen>
    );
  }

  const metric = detail?.metric || null;

  return (
    <Screen
      title={metric?.staffName || 'Performance'}
      subtitle={
        workspaceName
          ? `${detail?.rangeLabel || 'Detalle por barbero'} · ${workspaceName}`
          : (detail?.rangeLabel || 'Detalle por barbero')
      }
    >
      <View style={styles.rangeRow}>
        <RangeChip label="Hoy" active={range === 'today'} onPress={() => setRange('today')} />
        <RangeChip label="Ultimos 7 dias" active={range === 'last7'} onPress={() => setRange('last7')} />
        <RangeChip label="Este mes" active={range === 'month'} onPress={() => setRange('month')} />
      </View>

      {loading ? <MutedText>Cargando performance...</MutedText> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {metric ? (
        <>
          <View style={styles.grid}>
            <MetricCard label="Facturacion" value={formatCurrency(metric.totalRevenueCents)} />
            <MetricCard
              label="Facturacion / hora"
              value={formatCurrency(metric.revenuePerAvailableHourCents)}
            />
            <MetricCard label="Ocupacion" value={formatPercent(metric.occupancyRatio)} />
            <MetricCard label="Ticket promedio" value={formatCurrency(metric.averageTicketCents)} />
            <MetricCard
              label="Reseña"
              value={`${metric.trustedRating.toFixed(1)} (${metric.reviewCount})`}
            />
            <MetricCard label="Recompra" value={formatPercent(metric.repeatClientRate)} />
          </View>

          <Card>
            <Text style={styles.section}>Productividad</Text>
            <MetricLine label="Horas disponibles" value={formatHours(metric.availableMinutes)} />
            <MetricLine label="Horas reservadas" value={formatHours(metric.bookedMinutes)} />
            <MetricLine label="Horas atendidas" value={formatHours(metric.serviceMinutes)} />
            <MetricLine label="Realizadas" value={String(metric.completedAppointments)} />
          </Card>

          <Card>
            <Text style={styles.section}>Confiabilidad</Text>
            <MetricLine label="Canceladas por equipo" value={String(metric.staffCancellations)} />
            <MetricLine label="Canceladas por cliente" value={String(metric.customerCancellations)} />
            <MetricLine label="No show" value={String(metric.noShowAppointments)} />
            <MetricLine label="Tasa de cancelacion" value={formatPercent(metric.cancellationRate)} />
          </Card>

          <Card>
            <Text style={styles.section}>Clientes</Text>
            <MetricLine label="Clientes unicos" value={String(metric.uniqueCustomers)} />
            <MetricLine label="Clientes repetidos" value={String(metric.repeatCustomers)} />
            <MetricLine label="Reseñas" value={String(metric.reviewCount)} />
            <MetricLine label="Promedio bruto" value={metric.averageRating.toFixed(1)} />
          </Card>

          <Card>
            <Text style={styles.section}>Tendencia de reseñas</Text>
            <View style={styles.list}>
              {detail?.ratingTrend.length ? (
                detail.ratingTrend.map((item) => (
                  <View key={item.periodStart} style={styles.barRow}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.itemLabel}>
                        {new Date(`${item.periodStart}T00:00:00.000Z`).toLocaleDateString('es-UY', {
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </Text>
                      <Text style={styles.itemValue}>
                        {item.averageRating.toFixed(1)} ({item.reviewCount})
                      </Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.max(0, Math.min(100, (item.averageRating / maxTrendValue) * 100))}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <MutedText>Sin datos</MutedText>
              )}
            </View>
          </Card>

          <Card>
            <Text style={styles.section}>Reseñas recientes</Text>
            <View style={styles.list}>
              {detail?.recentReviews.length ? (
                detail.recentReviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.reviewName}>{review.customerName}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(review.submittedAt).toLocaleDateString('es-UY')}
                      </Text>
                    </View>
                    <Text style={styles.reviewRate}>{review.rating} / 5</Text>
                    {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                  </View>
                ))
              ) : (
                <MutedText>No hay reseñas publicadas en este rango.</MutedText>
              )}
            </View>
          </Card>

          <Card>
            <Text style={styles.section}>Lectura rapida</Text>
            <View style={styles.list}>
              {detail?.insights.map((item) => (
                <Text key={item} style={styles.insightText}>
                  {item}
                </Text>
              ))}
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function RangeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.rangeChip, active ? styles.rangeChipActive : null]} onPress={onPress}>
      <Text style={[styles.rangeChipText, active ? styles.rangeChipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rangeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rangeChipActive: {
    borderColor: palette.text,
    backgroundColor: palette.text,
  },
  rangeChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  rangeChipTextActive: {
    color: '#fff',
  },
  grid: {
    gap: 8,
  },
  metricCard: {
    gap: 2,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
  },
  section: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  itemLabel: {
    color: '#334155',
    fontSize: 13,
    flex: 1,
  },
  itemValue: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  barRow: {
    gap: 4,
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  reviewName: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 13,
  },
  reviewDate: {
    color: '#64748b',
    fontSize: 11,
  },
  reviewRate: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewComment: {
    color: '#475569',
    fontSize: 12,
  },
  insightText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
});
