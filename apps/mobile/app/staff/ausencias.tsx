import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card, Chip, ErrorText, Field, Label, MutedText, ActionButton, Screen } from '../../components/ui/primitives';
import { getStaffContext } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

interface TimeOffRecord {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  status: string;
  createdAt: string | null;
}

interface WorkingHourEntry {
  id: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
}

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export default function StaffAusenciasScreen() {
  const { colors } = useNavajaTheme();
  const [pendingRecords, setPendingRecords] = useState<TimeOffRecord[]>([]);
  const [approvedRecords, setApprovedRecords] = useState<TimeOffRecord[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHourEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const staff = await getStaffContext();
    if (!staff) {
      setLoading(false);
      return;
    }

    const [{ data: timeOff }, { data: hours }] = await Promise.all([
      supabase
        .from('time_off')
        .select('id, start_at, end_at, reason, status, created_at')
        .eq('shop_id', staff.shopId)
        .eq('staff_id', staff.staffId)
        .order('start_at', { ascending: false })
        .limit(20),
      supabase
        .from('working_hours')
        .select('id, day_of_week, start_time, end_time')
        .eq('shop_id', staff.shopId)
        .eq('staff_id', staff.staffId)
        .order('day_of_week'),
    ]);

    const allRecords: TimeOffRecord[] = (timeOff || []).map((item) => ({
      id: String(item.id),
      startAt: String(item.start_at),
      endAt: String(item.end_at),
      reason: (item.reason as string | null) || null,
      status: String(item.status),
      createdAt: (item.created_at as string | null) || null,
    }));

    setPendingRecords(allRecords.filter((r) => r.status === 'pending'));
    setApprovedRecords(allRecords.filter((r) => r.status === 'approved'));

    setWorkingHours(
      (hours || []).map((item) => ({
        id: String(item.id),
        dayLabel: DAY_LABELS[Number(item.day_of_week || 0)] ?? String(item.day_of_week),
        startTime: String(item.start_time || '').slice(0, 5),
        endTime: String(item.end_time || '').slice(0, 5),
      })),
    );

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function submitRequest() {
    if (!startAt || !endAt) {
      setSubmitError('Ingresa fecha de inicio y fin.');
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setSubmitError('Formato de fecha invalido. Usa YYYY-MM-DDTHH:MM.');
      return;
    }

    if (endDate <= startDate) {
      setSubmitError('La fecha de fin debe ser posterior al inicio.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const staff = await getStaffContext();
    if (!staff) {
      setSubmitError('Sin sesion de staff activa.');
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from('time_off').insert({
      shop_id: staff.shopId,
      staff_id: staff.staffId,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      reason: reason.trim() || null,
      status: 'pending',
    });

    if (insertError) {
      setSubmitError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubmitSuccess('Solicitud enviada. El admin la revisara en su inbox.');
    setStartAt('');
    setEndAt('');
    setReason('');
    setSubmitting(false);
    void loadData();
  }

  return (
    <Screen
      eyebrow="Staff"
      title="Mis ausencias"
      subtitle="Solicitudes de tiempo libre y horario fijo."
    >
      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Solicitar ausencia</Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          La solicitud entra como pendiente y el admin la resuelve desde su inbox. No puedes
          autoaprobar ni tocar ausencias ajenas.
        </Text>
        <Label>Inicio (YYYY-MM-DDTHH:MM)</Label>
        <Field
          value={startAt}
          onChangeText={setStartAt}
          placeholder="2024-06-10T09:00"
          autoCapitalize="none"
        />
        <Label>Fin (YYYY-MM-DDTHH:MM)</Label>
        <Field
          value={endAt}
          onChangeText={setEndAt}
          placeholder="2024-06-10T18:00"
          autoCapitalize="none"
        />
        <Label>Motivo (opcional)</Label>
        <Field value={reason} onChangeText={setReason} placeholder="Ej: Viaje, medico..." />
        {submitError ? <ErrorText message={submitError} /> : null}
        {submitSuccess ? (
          <Text style={[styles.success, { color: colors.success }]}>{submitSuccess}</Text>
        ) : null}
        <ActionButton
          label={submitting ? 'Enviando...' : 'Enviar solicitud'}
          onPress={submitRequest}
          loading={submitting}
          disabled={submitting}
        />
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mi horario fijo</Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          Referencia de tus bloques habituales para planificar ausencias.
        </Text>
        {loading ? <MutedText>Cargando...</MutedText> : null}
        {!loading && workingHours.length === 0 ? (
          <MutedText>Todavia no hay horarios definidos para tu perfil.</MutedText>
        ) : null}
        <View style={styles.hoursGrid}>
          {workingHours.map((entry) => (
            <View key={entry.id} style={[styles.hourTile, { borderColor: colors.border, backgroundColor: colors.panel }]}>
              <Text style={[styles.hourDay, { color: colors.text }]}>{entry.dayLabel}</Text>
              <Text style={[styles.hourTime, { color: colors.textMuted }]}>
                {entry.startTime} - {entry.endTime}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Solicitudes pendientes</Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          Pedidos enviados y todavia sin decision.
        </Text>
        {pendingRecords.length === 0 ? (
          <MutedText>No tienes solicitudes pendientes.</MutedText>
        ) : null}
        <View style={styles.list}>
          {pendingRecords.map((item) => (
            <View key={item.id} style={[styles.recordCard, { borderColor: colors.border, backgroundColor: colors.panel }]}>
              <View style={styles.recordRow}>
                <View style={styles.recordInfo}>
                  <Text style={[styles.recordDate, { color: colors.text }]}>
                    {formatDateTime(item.startAt)}
                  </Text>
                  <Text style={[styles.recordMeta, { color: colors.textMuted }]}>
                    hasta {formatDateTime(item.endAt)}
                  </Text>
                  {item.reason ? (
                    <Text style={[styles.recordReason, { color: colors.textMuted }]}>
                      {item.reason}
                    </Text>
                  ) : null}
                </View>
                <Chip label="Pendiente" tone="warning" />
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Historial aprobado</Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          Registro de ausencias ya incorporadas a tu agenda.
        </Text>
        {!loading && approvedRecords.length === 0 ? (
          <MutedText>Aun no tienes ausencias aprobadas.</MutedText>
        ) : null}
        <View style={styles.list}>
          {approvedRecords.map((item) => (
            <View key={item.id} style={[styles.recordCard, { borderColor: colors.border, backgroundColor: colors.panel }]}>
              <View style={styles.recordRow}>
                <View style={styles.recordInfo}>
                  <Text style={[styles.recordDate, { color: colors.text }]}>
                    {formatDateTime(item.startAt)}
                  </Text>
                  <Text style={[styles.recordMeta, { color: colors.textMuted }]}>
                    hasta {formatDateTime(item.endAt)}
                  </Text>
                  {item.reason ? (
                    <Text style={[styles.recordReason, { color: colors.textMuted }]}>
                      {item.reason}
                    </Text>
                  ) : null}
                  {item.createdAt ? (
                    <Text style={[styles.recordCreated, { color: colors.textMuted }]}>
                      Solicitada el {formatDateTime(item.createdAt)}
                    </Text>
                  ) : null}
                </View>
                <Chip label="Aprobada" tone="success" />
              </View>
            </View>
          ))}
        </View>
      </Card>

      <ErrorText message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  success: {
    fontSize: 13,
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourTile: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    minWidth: '45%',
    flex: 1,
  },
  hourDay: {
    fontSize: 13,
    fontWeight: '700',
  },
  hourTime: {
    fontSize: 12,
    marginTop: 4,
  },
  list: {
    gap: 8,
  },
  recordCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  recordInfo: {
    flex: 1,
    gap: 3,
  },
  recordDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  recordMeta: {
    fontSize: 12,
  },
  recordReason: {
    fontSize: 12,
    marginTop: 4,
  },
  recordCreated: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
});
