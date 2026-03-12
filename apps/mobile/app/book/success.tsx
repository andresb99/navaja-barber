import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, Card, Screen } from '../../components/ui/primitives';
import { formatDateTime } from '../../lib/format';
import { useNavajaTheme } from '../../lib/theme';

export default function BookingSuccessScreen() {
  const { colors } = useNavajaTheme();
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
    <Screen title="Reserva confirmada" subtitle="Listo. Te vamos a contactar por WhatsApp.">
      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>Tu turno quedo agendado</Text>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Servicio</Text>
          <Text style={[styles.value, { color: colors.text }]}>{details.service || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Barbero</Text>
          <Text style={[styles.value, { color: colors.text }]}>{details.staff || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Inicio</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {details.start ? formatDateTime(details.start) : '-'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textMuted }]}>ID</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {details.appointmentId || '-'}
          </Text>
        </View>
      </Card>

      <ActionButton label="Volver al inicio" onPress={() => router.replace('/(tabs)/inicio')} />
      <ActionButton
        label="Crear otra reserva"
        variant="secondary"
        onPress={() => router.replace('/(tabs)/reservas')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  title: {
    fontWeight: '800',
    fontSize: 18,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});
