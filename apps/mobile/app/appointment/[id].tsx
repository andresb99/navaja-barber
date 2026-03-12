import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActionButton, Card, ErrorText, Screen } from '../../components/ui/primitives';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { hasExternalApi, updateWorkspaceAppointmentStatusViaApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

interface AppointmentDetail {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  payment_status: string | null;
  price_cents: number;
  notes: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pago pendiente',
  processing: 'Pago procesando',
  approved: 'Pago aprobado',
  rejected: 'Pago rechazado',
  cancelled: 'Pago cancelado',
  refunded: 'Pago devuelto',
  expired: 'Pago vencido',
};

export default function AppointmentDetailsScreen() {
  const { colors } = useNavajaTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);

  const loadAppointment = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select('id, start_at, end_at, status, price_cents, notes, customer_name_snapshot, customer_phone_snapshot, customers(name, phone), services(name), payment_intents(status)')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !data) {
      setLoading(false);
      setError(fetchError?.message || 'No se encontro la cita.');
      setAppointment(null);
      return;
    }

    setAppointment({
      id: String(data.id),
      start_at: String(data.start_at),
      end_at: String(data.end_at),
      status: String(data.status),
      payment_status: (data.payment_intents as { status?: string } | null)?.status
        ? String((data.payment_intents as { status?: string } | null)?.status)
        : null,
      price_cents: Number(data.price_cents || 0),
      notes: String(data.notes || ''),
      customer_name: String(
        (data as { customer_name_snapshot?: string | null }).customer_name_snapshot ||
          (data.customers as { name?: string } | null)?.name ||
          'Invitado',
      ),
      customer_phone: String(
        (data as { customer_phone_snapshot?: string | null }).customer_phone_snapshot ||
          (data.customers as { phone?: string } | null)?.phone ||
          '',
      ),
      service_name: String((data.services as { name?: string } | null)?.name || 'Servicio'),
    });

    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadAppointment();
  }, [loadAppointment]);

  async function updateStatus(status: 'done' | 'no_show' | 'cancelled' | 'confirmed') {
    if (!appointment) {
      return;
    }
    if (!hasExternalApi) {
      setError('Configura EXPO_PUBLIC_API_BASE_URL para actualizar citas desde mobile.');
      return;
    }
    setUpdating(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';

    if (!accessToken) {
      setUpdating(false);
      setError('Debes iniciar sesion para actualizar citas.');
      return;
    }

    try {
      await updateWorkspaceAppointmentStatusViaApi({
        accessToken,
        appointmentId: appointment.id,
        status,
      });
    } catch (cause) {
      setUpdating(false);
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la cita.');
      return;
    }

    setAppointment({ ...appointment, status });
    setUpdating(false);
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <Screen title="Detalle de cita" subtitle="Actualiza estado y revisa informacion">
      <ErrorText message={error} />

      {!appointment ? (
        <Card>
          <Text style={[styles.empty, { color: colors.textMuted }]}>No hay datos para esta cita.</Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text style={[styles.title, { color: colors.text }]}>
              {formatDateTime(appointment.start_at)}
            </Text>
            <Text style={[styles.item, { color: colors.text }]}>
              Servicio: {appointment.service_name}
            </Text>
            <Text style={[styles.item, { color: colors.text }]}>
              Cliente: {appointment.customer_name}
            </Text>
            <Text style={[styles.item, { color: colors.text }]}>
              Telefono: {appointment.customer_phone || '-'}
            </Text>
            <Text style={[styles.item, { color: colors.text }]}>Estado: {appointment.status}</Text>
            <Text style={[styles.item, { color: colors.text }]}>
              Pago:{' '}
              {PAYMENT_STATUS_LABEL[appointment.payment_status || ''] ||
                (appointment.payment_status || 'sin pago')}
            </Text>
            <Text style={[styles.item, { color: colors.text }]}>
              Precio: {formatCurrency(appointment.price_cents)}
            </Text>
            <Text style={[styles.item, { color: colors.text }]}>
              Notas: {appointment.notes || 'Sin notas'}
            </Text>
          </Card>

          <Card>
            <Text style={[styles.section, { color: colors.text }]}>Acciones</Text>
            <View style={styles.actions}>
              <ActionButton
                label="Marcar confirmada"
                variant="secondary"
                onPress={() => updateStatus('confirmed')}
                disabled={updating}
              />
              <ActionButton
                label="Marcar asistio"
                onPress={() => updateStatus('done')}
                disabled={updating}
              />
              <ActionButton
                label="Marcar no se presento"
                variant="secondary"
                onPress={() => updateStatus('no_show')}
                disabled={updating}
              />
              <ActionButton
                label="Cancelar cita"
                variant="danger"
                onPress={() => updateStatus('cancelled')}
                disabled={updating}
              />
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    fontSize: 18,
  },
  item: {
    fontSize: 13,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    gap: 8,
  },
  empty: {
    fontSize: 13,
  },
});
