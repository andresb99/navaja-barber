import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card, MutedText, Screen } from '../../components/ui/primitives';
import { getAuthContext } from '../../lib/auth';
import { formatCurrency } from '../../lib/format';
import { DashboardMetrics, getDashboardMetrics, MetricRange } from '../../lib/metrics';
import { palette } from '../../lib/theme';

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No se presento',
  done: 'Realizada',
};

export default function AdminMetricsScreen() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<MetricRange>('today');
  const [error, setError] = useState<string | null>(null);
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

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const auth = await getAuthContext();
    if (auth.role !== 'admin') {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);

    try {
      const result = await getDashboardMetrics(range);
      setMetrics(result);
    } catch {
      setMetrics(null);
      setError('No se pudieron cargar las metricas.');
    }

    setLoading(false);
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      void loadMetrics();
    }, [loadMetrics]),
  );

  if (!allowed && !loading) {
    return (
      <Screen title="Metricas" subtitle="Acceso restringido">
        <Card>
          <Text style={styles.error}>No tienes permisos de admin.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Metricas" subtitle={metrics?.rangeLabel || 'KPI operativos'}>
      <View style={styles.rangeRow}>
        <RangeChip label="Hoy" active={range === 'today'} onPress={() => setRange('today')} />
        <RangeChip label="Ultimos 7 dias" active={range === 'last7'} onPress={() => setRange('last7')} />
        <RangeChip label="Este mes" active={range === 'month'} onPress={() => setRange('month')} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <MutedText>Cargando metricas...</MutedText> : null}
      {!loading && !metrics ? <MutedText>No hay informacion para este rango.</MutedText> : null}

      {metrics ? (
        <>
          <View style={styles.summaryGrid}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Facturacion</Text>
              <Text style={styles.summaryValue}>{formatCurrency(metrics.estimatedRevenueCents)}</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Ticket promedio</Text>
              <Text style={styles.summaryValue}>{formatCurrency(metrics.averageTicketCents)}</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Ocupacion</Text>
              <Text style={styles.summaryValue}>{Math.round(metrics.occupancyRatio * 100)}%</Text>
            </Card>
          </View>

          <Card>
            <Text style={styles.section}>Citas por estado</Text>
            <View style={styles.list}>
              {Object.entries(metrics.countsByStatus).map(([status, count]) => (
                <View key={status} style={styles.rowBetween}>
                  <Text style={styles.itemLabel}>{statusLabel[status] || status}</Text>
                  <Text style={styles.itemValue}>{count}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.section}>Servicios mas pedidos</Text>
            <View style={styles.list}>
              {metrics.topServices.length === 0 ? (
                <MutedText>Sin datos</MutedText>
              ) : (
                metrics.topServices.map((item) => (
                  <BarRow
                    key={item.service}
                    label={item.service}
                    value={item.count}
                    widthPercent={(item.count / maxTopServices) * 100}
                  />
                ))
              )}
            </View>
          </Card>

          <Card>
            <Text style={styles.section}>Facturacion por staff</Text>
            <View style={styles.list}>
              {metrics.revenueByStaff.length === 0 ? (
                <MutedText>Sin datos</MutedText>
              ) : (
                metrics.revenueByStaff.map((item) => (
                  <BarRow
                    key={item.staff}
                    label={item.staff}
                    valueLabel={formatCurrency(item.revenue_cents)}
                    widthPercent={(item.revenue_cents / maxRevenueByStaff) * 100}
                  />
                ))
              )}
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

function BarRow({
  label,
  value,
  valueLabel,
  widthPercent,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
  widthPercent: number;
}) {
  return (
    <View style={styles.barRow}>
      <View style={styles.rowBetween}>
        <Text style={styles.itemLabel}>{label}</Text>
        <Text style={styles.itemValue}>{valueLabel || String(value || 0)}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, widthPercent))}%` }]} />
      </View>
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
  summaryGrid: {
    gap: 8,
  },
  summaryCard: {
    gap: 2,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
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
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
});
