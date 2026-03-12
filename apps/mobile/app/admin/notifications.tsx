import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ActionButton,
  Card,
  Chip,
  ErrorText,
  MutedText,
  Screen,
} from '../../components/ui/primitives';
import {
  getAdminNotificationsSummaryViaApi,
  hasExternalApi,
  reviewAdminTimeOffViaApi,
  type AdminMembershipNotificationApi,
  type AdminPaymentNotificationApi,
  type AdminTimeOffNotificationApi,
} from '../../lib/api';
import { getAuthContext } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

function intentLabel(intentType: AdminPaymentNotificationApi['intentType']) {
  if (intentType === 'subscription') {
    return 'Cobro de suscripcion pendiente';
  }

  if (intentType === 'course_enrollment') {
    return 'Pago de curso pendiente';
  }

  return 'Pago de reserva pendiente';
}

export default function AdminNotificationsScreen() {
  const { colors } = useNavajaTheme();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingTimeOffCount, setPendingTimeOffCount] = useState(0);
  const [pendingMembershipCount, setPendingMembershipCount] = useState(0);
  const [stalePendingIntents, setStalePendingIntents] = useState(0);
  const [timeOffRequests, setTimeOffRequests] = useState<AdminTimeOffNotificationApi[]>([]);
  const [membershipNotifications, setMembershipNotifications] = useState<
    AdminMembershipNotificationApi[]
  >([]);
  const [paymentNotifications, setPaymentNotifications] = useState<AdminPaymentNotificationApi[]>(
    [],
  );
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!hasExternalApi) {
      setAllowed(false);
      setLoading(false);
      setError('Configura EXPO_PUBLIC_API_BASE_URL para abrir notificaciones admin.');
      return;
    }

    const auth = await getAuthContext();
    if (auth.role !== 'admin' || !auth.shopId) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';

    if (!accessToken) {
      setAllowed(false);
      setLoading(false);
      setError('Debes iniciar sesion para abrir notificaciones.');
      return;
    }

    try {
      const response = await getAdminNotificationsSummaryViaApi({
        accessToken,
        shopId: auth.shopId,
      });

      if (!response) {
        throw new Error('No se pudieron cargar las notificaciones admin.');
      }

      setAllowed(true);
      setWorkspaceName(auth.shopName || 'Barberia');
      setPendingCount(Number(response.pending_count || 0));
      setPendingTimeOffCount(Number(response.pending_time_off_count || 0));
      setPendingMembershipCount(Number(response.pending_membership_count || 0));
      setStalePendingIntents(Number(response.stale_pending_intents || 0));
      setTimeOffRequests(response.pending_time_off_requests || []);
      setMembershipNotifications(response.pending_membership_notifications || []);
      setPaymentNotifications(response.pending_payment_notifications || []);
    } catch (cause) {
      setAllowed(true);
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudieron cargar las notificaciones admin.',
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

  async function reviewTimeOff(timeOffId: string, decision: 'approve' | 'reject') {
    const auth = await getAuthContext();
    if (!auth.shopId) {
      setError('No hay una barberia activa para esta accion.');
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';
    if (!accessToken) {
      setError('Debes iniciar sesion para revisar ausencias.');
      return;
    }

    const nextKey = `${decision}:${timeOffId}`;
    setReviewingKey(nextKey);
    setError(null);

    try {
      await reviewAdminTimeOffViaApi({
        accessToken,
        shopId: auth.shopId,
        timeOffId,
        decision,
      });
      await loadData();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo revisar la solicitud de ausencia.',
      );
    } finally {
      setReviewingKey(null);
    }
  }

  if (!allowed && !loading) {
    return (
      <Screen title="Notificaciones" subtitle="Acceso restringido">
        <Card>
          <Text style={[styles.title, { color: colors.text }]}>
            Tu cuenta no tiene un workspace admin activo.
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Cambia de barberia o vuelve a tu cuenta para seleccionar otro contexto.
          </Text>
          <ActionButton
            label="Ir a mi cuenta"
            variant="secondary"
            onPress={() => router.replace('/(tabs)/cuenta')}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Notificaciones"
      subtitle={
        workspaceName
          ? `Inbox operativo del local · ${workspaceName}`
          : 'Inbox operativo del local'
      }
    >
      <ErrorText message={error} />
      {loading ? <MutedText>Cargando alertas operativas...</MutedText> : null}

      <View style={styles.summaryGrid}>
        <SummaryCard
          label="Ausencias"
          value={pendingTimeOffCount}
          detail="Solicitudes del equipo esperando aprobacion o rechazo."
        />
        <SummaryCard
          label="Invitaciones"
          value={pendingMembershipCount}
          detail="Miembros pendientes de aceptar acceso al local."
        />
        <SummaryCard
          label="Pagos"
          value={stalePendingIntents}
          detail="Checkouts con mas de 30 minutos sin resolverse."
        />
      </View>

      {!loading && pendingCount === 0 ? (
        <Card>
          <Chip label="Todo al dia" tone="success" />
          <Text style={[styles.title, { color: colors.text }]}>
            No hay alertas activas en este momento
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            La barberia no tiene ausencias pendientes, invitaciones sin respuesta ni pagos
            estancados.
          </Text>
          <ActionButton label="Volver al resumen" variant="secondary" onPress={() => router.replace('/admin')} />
        </Card>
      ) : null}

      {timeOffRequests.map((item) => {
        const approveKey = `approve:${item.id}`;
        const rejectKey = `reject:${item.id}`;
        return (
          <Card key={`time-off:${item.id}`} elevated>
            <View style={styles.cardHeader}>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: colors.text }]}>Solicitud de ausencia</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>{item.staffName}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {formatDateTime(item.startAt)} a {formatDateTime(item.endAt)}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {item.reason || 'Sin motivo'}
                </Text>
              </View>
              <Chip label="Pendiente" tone="warning" />
            </View>
            <View style={styles.actions}>
              <ActionButton
                label="Aprobar ausencia"
                onPress={() => {
                  void reviewTimeOff(item.id, 'approve');
                }}
                loading={reviewingKey === approveKey}
                disabled={Boolean(reviewingKey)}
              />
              <ActionButton
                label="Rechazar"
                variant="secondary"
                onPress={() => {
                  void reviewTimeOff(item.id, 'reject');
                }}
                loading={reviewingKey === rejectKey}
                disabled={Boolean(reviewingKey)}
              />
            </View>
          </Card>
        );
      })}

      {membershipNotifications.map((item) => (
        <Card key={`membership:${item.id}`}>
          <View style={styles.cardHeader}>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.text }]}>Invitacion pendiente</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{item.profileName}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Rol ofrecido: {item.role === 'admin' ? 'Administrador' : 'Staff'}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Creada: {formatDateTime(item.createdAt)}
              </Text>
            </View>
            <Chip label="Sin respuesta" tone="warning" />
          </View>
        </Card>
      ))}

      {paymentNotifications.map((item) => (
        <Card key={`payment:${item.id}`}>
          <View style={styles.cardHeader}>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.text }]}>{intentLabel(item.intentType)}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {item.customerName || 'Checkout sin cliente visible'}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Detectado: {formatDateTime(item.createdAt)}
              </Text>
            </View>
            <Chip label="Seguimiento" tone="warning" />
          </View>
          <ActionButton
            label="Abrir citas"
            variant="secondary"
            onPress={() => router.push('/admin/appointments')}
          />
        </Card>
      ))}
    </Screen>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  const { colors } = useNavajaTheme();

  return (
    <Card style={styles.summaryCard}>
      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>{detail}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    gap: 10,
  },
  summaryCard: {
    gap: 6,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    gap: 8,
  },
});
