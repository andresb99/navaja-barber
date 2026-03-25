import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  ActionButton,
  Card,
  Chip,
  ErrorText,
  Field,
  Label,
  MutedText,
  Screen,
} from '../../components/ui/primitives';
import { getStaffContext } from '../../lib/auth';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

interface StaffCita {
  id: string;
  startAt: string;
  status: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  priceCents: number;
}

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

const TERMINAL_STATUSES = new Set(['done', 'cancelled', 'no_show', 'refunded']);

function toneForStatus(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'done') return 'success';
  if (status === 'pending' || status === 'confirmed') return 'warning';
  if (status === 'cancelled' || status === 'no_show') return 'danger';
  return 'neutral';
}

export default function StaffCitasScreen() {
  const { colors } = useNavajaTheme();
  const [shopId, setShopId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [pendingClosure, setPendingClosure] = useState<StaffCita[]>([]);
  const [upcoming, setUpcoming] = useState<StaffCita[]>([]);
  const [recentClosed, setRecentClosed] = useState<StaffCita[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Walk-in form state
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startAtInput, setStartAtInput] = useState('');
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

    setShopId(staff.shopId);
    setStaffId(staff.staffId ?? '');

    const now = new Date();
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 2);
    const to = new Date(now);
    to.setUTCDate(to.getUTCDate() + 14);

    const [{ data: appts }, { data: services }] = await Promise.all([
      supabase
        .from('appointments')
        .select(
          'id, start_at, status, price_cents, customer_name_snapshot, customer_phone_snapshot, customers(name, phone), services(name)',
        )
        .eq('shop_id', staff.shopId)
        .eq('staff_id', staff.staffId)
        .gte('start_at', from.toISOString())
        .lt('start_at', to.toISOString())
        .order('start_at'),
      supabase
        .from('services')
        .select('id, name, duration_minutes, price_cents')
        .eq('shop_id', staff.shopId)
        .eq('is_active', true)
        .order('name'),
    ]);

    const mapped: StaffCita[] = (appts || []).map((item) => ({
      id: String(item.id),
      startAt: String(item.start_at),
      status: String(item.status),
      customerName: String(
        (item as { customer_name_snapshot?: string | null }).customer_name_snapshot ||
          (item.customers as { name?: string } | null)?.name ||
          'Invitado',
      ),
      customerPhone: String(
        (item as { customer_phone_snapshot?: string | null }).customer_phone_snapshot ||
          (item.customers as { phone?: string } | null)?.phone ||
          '',
      ),
      serviceName: String((item.services as { name?: string } | null)?.name || 'Servicio'),
      priceCents: Number(item.price_cents || 0),
    }));

    setPendingClosure(
      mapped.filter((a) => new Date(a.startAt) <= now && !TERMINAL_STATUSES.has(a.status)),
    );
    setUpcoming(mapped.filter((a) => new Date(a.startAt) > now));
    setRecentClosed(
      mapped
        .filter((a) => new Date(a.startAt) <= now && TERMINAL_STATUSES.has(a.status))
        .reverse()
        .slice(0, 6),
    );

    setServiceOptions(
      (services || []).map((s) => ({
        id: String(s.id),
        name: String(s.name),
        durationMinutes: Number(s.duration_minutes || 30),
        priceCents: Number(s.price_cents || 0),
      })),
    );

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function registerWalkIn() {
    if (!selectedServiceId || !customerName || !startAtInput) {
      setSubmitError('Completa servicio, nombre del cliente y horario.');
      return;
    }

    const startDate = new Date(startAtInput);
    if (Number.isNaN(startDate.getTime())) {
      setSubmitError('Formato de fecha invalido. Usa YYYY-MM-DDTHH:MM.');
      return;
    }

    const service = serviceOptions.find((s) => s.id === selectedServiceId);
    if (!service) {
      setSubmitError('Servicio no encontrado.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const endDate = new Date(startDate.getTime() + service.durationMinutes * 60000);

    const { error: insertError } = await supabase.from('appointments').insert({
      shop_id: shopId,
      staff_id: staffId,
      service_id: selectedServiceId,
      customer_name_snapshot: customerName.trim(),
      customer_phone_snapshot: customerPhone.trim() || null,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      price_cents: service.priceCents,
      status: 'confirmed',
      source_channel: 'WALK_IN',
    });

    if (insertError) {
      setSubmitError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubmitSuccess('Walk-in registrado correctamente.');
    setSelectedServiceId('');
    setCustomerName('');
    setCustomerPhone('');
    setStartAtInput('');
    setSubmitting(false);
    void loadData();
  }

  return (
    <Screen
      eyebrow="Staff"
      title="Mis citas"
      subtitle="Agenda propia, walk-ins y estados de citas."
    >
      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Registrar cliente presencial
        </Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          Solo puedes crear walk-ins para tu propia agenda.
        </Text>
        {serviceOptions.length === 0 && !loading ? (
          <MutedText>Necesitas al menos un servicio activo para registrar un walk-in.</MutedText>
        ) : null}
        <Label>Servicio</Label>
        <Field
          value={selectedServiceId ? (serviceOptions.find((s) => s.id === selectedServiceId)?.name ?? '') : ''}
          onChangeText={(text) => {
            const match = serviceOptions.find((s) => s.name.toLowerCase().startsWith(text.toLowerCase()));
            setSelectedServiceId(match?.id ?? '');
          }}
          placeholder="Nombre del servicio..."
        />
        <View style={styles.serviceList}>
          {serviceOptions.map((s) => (
            <Text
              key={s.id}
              style={[
                styles.serviceOption,
                {
                  color: selectedServiceId === s.id ? colors.accent : colors.textMuted,
                  borderColor: selectedServiceId === s.id ? colors.borderActive : colors.border,
                  backgroundColor: selectedServiceId === s.id ? colors.panel : 'transparent',
                },
              ]}
              onPress={() => setSelectedServiceId(s.id)}
            >
              {s.name} — {formatCurrency(s.priceCents)}
            </Text>
          ))}
        </View>
        <Label>Nombre del cliente</Label>
        <Field value={customerName} onChangeText={setCustomerName} placeholder="Juan Perez" />
        <Label>Telefono (opcional)</Label>
        <Field
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
          placeholder="+598 99 000 000"
        />
        <Label>Hora de inicio (YYYY-MM-DDTHH:MM)</Label>
        <Field
          value={startAtInput}
          onChangeText={setStartAtInput}
          placeholder="2024-06-10T10:00"
          autoCapitalize="none"
        />
        {submitError ? <ErrorText message={submitError} /> : null}
        {submitSuccess ? (
          <Text style={[styles.success, { color: colors.success }]}>{submitSuccess}</Text>
        ) : null}
        <ActionButton
          label={submitting ? 'Registrando...' : 'Registrar walk-in'}
          onPress={registerWalkIn}
          loading={submitting}
          disabled={submitting}
        />
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Citas para cerrar</Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          Citas que ya pasaron y todavia siguen abiertas.
        </Text>
        {loading ? <MutedText>Cargando...</MutedText> : null}
        {!loading && pendingClosure.length === 0 ? (
          <MutedText>No hay citas pendientes de cierre.</MutedText>
        ) : null}
        <View style={styles.list}>
          {pendingClosure.map((item) => (
            <CitaCard key={item.id} item={item} colors={colors} />
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Agenda proxima</Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          Tus reservas futuras con contexto de cliente y servicio.
        </Text>
        {!loading && upcoming.length === 0 ? (
          <MutedText>No tienes citas proximas en esta ventana.</MutedText>
        ) : null}
        <View style={styles.list}>
          {upcoming.map((item) => (
            <CitaCard key={item.id} item={item} colors={colors} />
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Historial reciente</Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          Ultimas citas cerradas dentro de tu ventana operativa.
        </Text>
        {!loading && recentClosed.length === 0 ? (
          <MutedText>Aun no hay movimientos recientes para mostrar.</MutedText>
        ) : null}
        <View style={styles.list}>
          {recentClosed.map((item) => (
            <CitaCard key={item.id} item={item} colors={colors} />
          ))}
        </View>
      </Card>

      <ErrorText message={error} />
    </Screen>
  );
}

function CitaCard({
  item,
  colors,
}: {
  item: StaffCita;
  colors: ReturnType<typeof useNavajaTheme>['colors'];
}) {
  return (
    <View style={[styles.citaCard, { borderColor: colors.border, backgroundColor: colors.panel }]}>
      <View style={styles.citaRow}>
        <Text style={[styles.citaDate, { color: colors.text }]}>{formatDateTime(item.startAt)}</Text>
        <Chip label={item.status} tone={toneForStatus(item.status)} />
      </View>
      <Text style={[styles.citaMeta, { color: colors.textMuted }]}>
        {item.customerName}
        {item.customerPhone ? ` · ${item.customerPhone}` : ''}
      </Text>
      <Text style={[styles.citaMeta, { color: colors.textMuted }]}>
        {item.serviceName} · {formatCurrency(item.priceCents)}
      </Text>
    </View>
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
  serviceList: {
    gap: 6,
    marginBottom: 4,
  },
  serviceOption: {
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  list: {
    gap: 8,
  },
  citaCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  citaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  citaDate: {
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  citaMeta: {
    fontSize: 12,
  },
});
