import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActionButton, Card, ErrorText, Screen } from '../../components/ui/primitives';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface AppointmentDetail {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  price_cents: number;
  notes: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
}

export default function AppointmentDetailsScreen() {
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
      .select('id, start_at, end_at, status, price_cents, notes, customers(name, phone), services(name)')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !data) {
      setLoading(false);
      setError(fetchError?.message || 'No se encontró la cita.');
      setAppointment(null);
      return;
    }

    setAppointment({
      id: String(data.id),
      start_at: String(data.start_at),
      end_at: String(data.end_at),
      status: String(data.status),
      price_cents: Number(data.price_cents || 0),
      notes: String(data.notes || ''),
      customer_name: String((data.customers as { name?: string } | null)?.name || 'Invitado'),
      customer_phone: String((data.customers as { phone?: string } | null)?.phone || ''),
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
    setUpdating(true);
    setError(null);

    const { error: updateError } = await supabase.from('appointments').update({ status }).eq('id', appointment.id);

    if (updateError) {
      setUpdating(false);
      setError(updateError.message);
      return;
    }

    setAppointment({ ...appointment, status });
    setUpdating(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Screen title="Detalle de cita" subtitle="Actualiza estado y revisa información">
      <ErrorText message={error} />

      {!appointment ? (
        <Card>
          <Text style={styles.empty}>No hay datos para esta cita.</Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text style={styles.title}>{formatDateTime(appointment.start_at)}</Text>
            <Text style={styles.item}>Servicio: {appointment.service_name}</Text>
            <Text style={styles.item}>Cliente: {appointment.customer_name}</Text>
            <Text style={styles.item}>Teléfono: {appointment.customer_phone || '-'}</Text>
            <Text style={styles.item}>Estado: {appointment.status}</Text>
            <Text style={styles.item}>Precio: {formatCurrency(appointment.price_cents)}</Text>
            <Text style={styles.item}>Notas: {appointment.notes || 'Sin notas'}</Text>
          </Card>

          <Card>
            <Text style={styles.section}>Acciones</Text>
            <View style={styles.actions}>
              <ActionButton
                label="Marcar confirmada"
                variant="secondary"
                onPress={() => updateStatus('confirmed')}
                disabled={updating}
              />
              <ActionButton label="Marcar asistió" onPress={() => updateStatus('done')} disabled={updating} />
              <ActionButton
                label="Marcar no se presentó"
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
    backgroundColor: palette.bg,
  },
  title: {
    color: palette.text,
    fontWeight: '800',
    fontSize: 18,
  },
  item: {
    color: '#334155',
    fontSize: 13,
  },
  section: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    gap: 8,
  },
  empty: {
    color: '#64748b',
    fontSize: 13,
  },
});
