import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Screen } from '../../components/ui/primitives';
import { formatDateTime } from '../../lib/format';
import { palette } from '../../lib/theme';

export default function BookingSuccessScreen() {
  const params = useLocalSearchParams<{
    appointment?: string;
    start?: string;
    service?: string;
    staff?: string;
  }>();

  const details = useMemo(
    () => ({
      appointmentId: String(params.appointment || ''),
      start: params.start ? String(params.start) : '',
      service: String(params.service || ''),
      staff: String(params.staff || ''),
    }),
    [params],
  );

  return (
    <Screen title="Reserva confirmada" subtitle="¡Listo! Te vamos a contactar por WhatsApp.">
      <Card style={styles.card}>
        <Text style={styles.title}>Tu turno quedó agendado</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Servicio</Text>
          <Text style={styles.value}>{details.service || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Barbero</Text>
          <Text style={styles.value}>{details.staff || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Inicio</Text>
          <Text style={styles.value}>{details.start ? formatDateTime(details.start) : '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>ID</Text>
          <Text style={styles.value}>{details.appointmentId || '-'}</Text>
        </View>
      </Card>

      <Pressable style={styles.button} onPress={() => router.replace('/(tabs)/inicio')}>
        <Text style={styles.buttonText}>Volver al inicio</Text>
      </Pressable>
      <Pressable style={styles.ghostButton} onPress={() => router.replace('/(tabs)/reservas')}>
        <Text style={styles.ghostText}>Crear otra reserva</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  title: {
    color: palette.text,
    fontWeight: '800',
    fontSize: 18,
  },
  row: {
    gap: 2,
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: palette.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  ghostButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  ghostText: {
    color: '#334155',
    fontWeight: '600',
  },
});
