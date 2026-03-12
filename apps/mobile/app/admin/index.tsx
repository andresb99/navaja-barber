import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  ActionButton,
  Card,
  ErrorText,
  HeroPanel,
  MutedText,
  Screen,
  StatTile,
  SurfaceCard,
} from '../../components/ui/primitives';
import { getAuthContext } from '../../lib/auth';
import { formatCurrency } from '../../lib/format';
import { getDashboardMetrics } from '../../lib/metrics';
import { useNavajaTheme } from '../../lib/theme';

type AdminRoute = '/mis-barberias' | '/admin/notifications' | '/admin/appointments' | '/admin/staff' | '/admin/barbershop' | '/admin/services' | '/admin/courses' | '/admin/modelos' | '/admin/applicants' | '/admin/metrics';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface AdminActionItem {
  label: string;
  description: string;
  route: AdminRoute;
  icon: IconName;
}

const operationsActions: AdminActionItem[] = [
  {
    label: 'Mis barberias',
    description: 'Cambia de workspace y revisa accesos por local.',
    route: '/mis-barberias',
    icon: 'business-outline',
  },
  {
    label: 'Notificaciones',
    description: 'Solicitudes, ausencias y pendientes del admin.',
    route: '/admin/notifications',
    icon: 'notifications-outline',
  },
  {
    label: 'Citas',
    description: 'Agenda operativa con estado y detalle de reservas.',
    route: '/admin/appointments',
    icon: 'calendar-outline',
  },
  {
    label: 'Equipo',
    description: 'Gestiona staff, roles y disponibilidad.',
    route: '/admin/staff',
    icon: 'people-outline',
  },
  {
    label: 'Metricas',
    description: 'KPIs, revenue, canales y performance del staff.',
    route: '/admin/metrics',
    icon: 'analytics-outline',
  },
];

const growthActions: AdminActionItem[] = [
  {
    label: 'Barberia',
    description: 'Datos base, identidad y configuracion del local.',
    route: '/admin/barbershop',
    icon: 'storefront-outline',
  },
  {
    label: 'Servicios',
    description: 'Catalogo, duracion y precios publicados.',
    route: '/admin/services',
    icon: 'cut-outline',
  },
  {
    label: 'Cursos',
    description: 'Formacion, sesiones y pipeline de inscripciones.',
    route: '/admin/courses',
    icon: 'school-outline',
  },
  {
    label: 'Modelos',
    description: 'Convocatorias, sesiones y matching de perfiles.',
    route: '/admin/modelos',
    icon: 'images-outline',
  },
  {
    label: 'Postulantes',
    description: 'CVs, filtros y seguimiento de candidatos.',
    route: '/admin/applicants',
    icon: 'briefcase-outline',
  },
];

export default function AdminHomeScreen() {
  const { colors } = useNavajaTheme();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [revenue, setRevenue] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [occupancy, setOccupancy] = useState(0);

  const primaryAction = useMemo<AdminActionItem>(
    () =>
      operationsActions.find((item) => item.route === '/admin/metrics') || {
        label: 'Metricas',
        description: 'KPIs, revenue, canales y performance del staff.',
        route: '/admin/metrics',
        icon: 'analytics-outline',
      },
    [],
  );

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const auth = await getAuthContext();
      if (auth.role !== 'admin' || !auth.shopId) {
        setAllowed(false);
        return;
      }

      setAllowed(true);
      setWorkspaceName(auth.shopName || 'Barberia');

      const metrics = await getDashboardMetrics('today', 'ALL', auth.shopId);
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
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Tu cuenta no tiene permisos de administrador.
          </Text>
          <ActionButton
            label="Ir a mi cuenta"
            onPress={() => router.replace('/(tabs)/cuenta')}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow="Admin"
      title="Panel admin"
      subtitle={
        workspaceName
          ? `Resumen operativo de hoy - ${workspaceName}`
          : 'Resumen operativo de hoy'
      }
    >
      <HeroPanel
        eyebrow="Operacion"
        title={workspaceName || 'Control del negocio'}
        description="El home admin mobile ahora sigue la misma jerarquia que web: resumen corto arriba y accesos agrupados por operacion y crecimiento."
      >
        <View style={styles.heroStats}>
          <StatTile label="Facturacion" value={loading ? '--' : formatCurrency(revenue)} />
          <StatTile label="Ticket promedio" value={loading ? '--' : formatCurrency(avgTicket)} />
          <StatTile label="Ocupacion" value={loading ? '--' : `${occupancy}%`} />
        </View>
        <ActionButton
          label={`Abrir ${primaryAction.label}`}
          onPress={() => router.push(primaryAction.route)}
          style={styles.heroAction}
        />
      </HeroPanel>

      <ErrorText message={error} />
      {loading ? (
        <Card>
          <MutedText>Cargando metricas...</MutedText>
        </Card>
      ) : null}

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Operacion diaria</Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          Lo mas usado para mover el negocio durante el dia.
        </Text>
        <View style={styles.actionGrid}>
          {operationsActions.map((item) => (
            <AdminActionTile key={item.route} item={item} />
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Configuracion y crecimiento</Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          Catalogo, academia, modelos y pipeline comercial.
        </Text>
        <View style={styles.actionGrid}>
          {growthActions.map((item) => (
            <AdminActionTile key={item.route} item={item} />
          ))}
        </View>
      </Card>
    </Screen>
  );
}

function AdminActionTile({ item }: { item: AdminActionItem }) {
  const { colors } = useNavajaTheme();

  return (
    <SurfaceCard
      onPress={() => router.push(item.route)}
      style={styles.actionTile}
      contentStyle={styles.actionTileContent}
    >
      <View
        style={[
          styles.actionIconWrap,
          {
            borderColor: colors.borderActive,
            backgroundColor: colors.pillActive,
          },
        ]}
      >
        <Ionicons name={item.icon} size={18} color={colors.textAccent} />
      </View>
      <Text style={[styles.actionTitle, { color: colors.text }]}>{item.label}</Text>
      <Text style={[styles.actionDescription, { color: colors.textMuted }]}>
        {item.description}
      </Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  warningText: {
    fontWeight: '700',
    fontSize: 14,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
  },
  heroAction: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionGrid: {
    gap: 8,
  },
  actionTile: {
    padding: 0,
  },
  actionTileContent: {
    gap: 8,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
});
