import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Card, ErrorText, MutedText, Screen } from '../../components/ui/primitives';
import { getAuthContext } from '../../lib/auth';
import { formatCurrency } from '../../lib/format';
import { getDashboardMetrics } from '../../lib/metrics';
import { palette } from '../../lib/theme';

export default function AdminHomeScreen() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenue, setRevenue] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [occupancy, setOccupancy] = useState(0);

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const auth = await getAuthContext();
      if (auth.role !== 'admin') {
        setAllowed(false);
        return;
      }
      setAllowed(true);

      const metrics = await getDashboardMetrics('today');
      setRevenue(metrics.estimatedRevenueCents);
      setAvgTicket(metrics.averageTicketCents);
      setOccupancy(Math.round(metrics.occupancyRatio * 100));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudieron cargar las metricas del panel admin.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  if (!allowed && !loading) {
    return (
      <Screen title="Panel admin" subtitle="Acceso restringido">
        <Card>
          <Text style={styles.warning}>Tu cuenta no tiene permisos de administrador.</Text>
          <Pressable style={styles.button} onPress={() => router.replace('/(tabs)/cuenta')}>
            <Text style={styles.buttonText}>Ir a mi cuenta</Text>
          </Pressable>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Panel admin" subtitle="Resumen operativo de hoy">
      <ErrorText message={error} />
      {loading ? <MutedText>Cargando métricas...</MutedText> : null}

      <View style={styles.metrics}>
        <MetricCard title="Facturación" value={formatCurrency(revenue)} />
        <MetricCard title="Ticket promedio" value={formatCurrency(avgTicket)} />
        <MetricCard title="Ocupación" value={`${occupancy}%`} />
      </View>

      <Card>
        <Text style={styles.section}>Gestión</Text>
        <View style={styles.grid}>
          <AdminNav label="Citas" onPress={() => router.push('/admin/appointments')} />
          <AdminNav label="Equipo" onPress={() => router.push('/admin/staff')} />
          <AdminNav label="Servicios" onPress={() => router.push('/admin/services')} />
          <AdminNav label="Cursos" onPress={() => router.push('/admin/courses')} />
          <AdminNav label="Modelos" onPress={() => router.push('/admin/modelos')} />
          <AdminNav label="Postulantes" onPress={() => router.push('/admin/applicants')} />
          <AdminNav label="Métricas" onPress={() => router.push('/admin/metrics')} />
        </View>
      </Card>
    </Screen>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
  );
}

function AdminNav({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.nav} onPress={onPress}>
      <Text style={styles.navText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  warning: {
    color: '#92400e',
    fontWeight: '700',
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: palette.text,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  metrics: {
    gap: 8,
  },
  metricCard: {
    gap: 2,
  },
  metricTitle: {
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
  grid: {
    gap: 8,
  },
  nav: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  navText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
  },
});
