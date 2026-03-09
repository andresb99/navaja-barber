import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { parseCurrencyInputToCents } from '@navaja/shared';
import { ActionButton, Card, Field, Label, MutedText, Screen } from '../../components/ui/primitives';
import { hasExternalApi, updateWorkspaceAppointmentStatusViaApi } from '../../lib/api';
import { getAuthContext } from '../../lib/auth';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface StaffOption {
  id: string;
  name: string;
}

interface AppointmentItem {
  id: string;
  staff_id: string;
  start_at: string;
  status: string;
  payment_status: string | null;
  price_cents: number;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  staff_name: string;
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled', 'no_show', 'done'] as const;
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'pendiente',
  processing: 'procesando',
  approved: 'aprobado',
  rejected: 'rechazado',
  cancelled: 'cancelado',
  refunded: 'devuelto',
  expired: 'vencido',
};

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default function AdminAppointmentsScreen() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');

  const [fromDate, setFromDate] = useState(isoDate(new Date()));
  const [toDate, setToDate] = useState(isoDate(new Date()));
  const [staffFilter, setStaffFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((item) => {
        if (staffFilter && item.staff_id !== staffFilter) {
          return false;
        }
        if (statusFilter && item.status !== statusFilter) {
          return false;
        }
        return true;
      }),
    [appointments, staffFilter, statusFilter],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const auth = await getAuthContext();
    if (auth.role !== 'admin' || !auth.shopId) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);
    setWorkspaceName(auth.shopName || 'Barberia');

    const [{ data: staffRows }, { data: appointmentsRows, error: appointmentsError }] = await Promise.all([
      supabase
        .from('staff')
        .select('id, name')
        .eq('shop_id', auth.shopId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('appointments')
        .select('id, staff_id, start_at, status, price_cents, customers(name, phone), services(name), staff(name), payment_intents(status)')
        .eq('shop_id', auth.shopId)
        .gte('start_at', `${fromDate}T00:00:00.000Z`)
        .lte('start_at', `${toDate}T23:59:59.999Z`)
        .order('start_at'),
    ]);

    if (appointmentsError) {
      setLoading(false);
      setStaff([]);
      setAppointments([]);
      setError(appointmentsError.message);
      return;
    }

    setStaff(
      (staffRows || []).map((item) => ({
        id: String(item.id),
        name: String(item.name || ''),
      })),
    );
    setAppointments(
      (appointmentsRows || []).map((item) => ({
        id: String(item.id),
        staff_id: String(item.staff_id),
        start_at: String(item.start_at),
        status: String(item.status),
        payment_status: (item.payment_intents as { status?: string } | null)?.status
          ? String((item.payment_intents as { status?: string } | null)?.status)
          : null,
        price_cents: Number(item.price_cents || 0),
        customer_name: String((item.customers as { name?: string } | null)?.name || 'Sin nombre'),
        customer_phone: String((item.customers as { phone?: string } | null)?.phone || ''),
        service_name: String((item.services as { name?: string } | null)?.name || 'Servicio'),
        staff_name: String((item.staff as { name?: string } | null)?.name || 'Sin asignar'),
      })),
    );
    setLoading(false);
  }, [fromDate, toDate]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function updateStatus(appointmentId: string, status: string) {
    if (!hasExternalApi) {
      setError('Configura EXPO_PUBLIC_API_BASE_URL para actualizar citas desde mobile.');
      return;
    }
    setSavingId(appointmentId);
    setError(null);

    const updatePayload: Record<string, unknown> = { status };
    const priceRaw = priceOverrides[appointmentId];
    if (status === 'done' && priceRaw) {
      const priceCents = parseCurrencyInputToCents(priceRaw);
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        setSavingId(null);
        setError('El precio override no es valido.');
        return;
      }
      updatePayload.price_cents = priceCents;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';
    if (!accessToken) {
      setSavingId(null);
      setError('Debes iniciar sesion para actualizar citas.');
      return;
    }

    try {
      const requestPayload = {
        accessToken,
        appointmentId,
        status: status as 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'done',
        ...(typeof updatePayload.price_cents === 'number'
          ? { priceCents: Number(updatePayload.price_cents) }
          : {}),
      };

      await updateWorkspaceAppointmentStatusViaApi(requestPayload);
    } catch (cause) {
      setSavingId(null);
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la cita.');
      return;
    }

    setAppointments((current) =>
      current.map((item) =>
        item.id === appointmentId
          ? { ...item, status, price_cents: Number(updatePayload.price_cents ?? item.price_cents) }
          : item,
      ),
    );
    setSavingId(null);
  }

  if (!allowed && !loading) {
    return (
      <Screen title="Citas" subtitle="Acceso restringido">
        <Card>
          <Text style={styles.error}>No tienes permisos de admin.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Citas"
      subtitle={workspaceName ? `Filtra y actualiza estados de reservas · ${workspaceName}` : 'Filtra y actualiza estados de reservas'}
    >
      <Card>
        <Label>Desde (YYYY-MM-DD)</Label>
        <Field value={fromDate} onChangeText={setFromDate} />
        <Label>Hasta (YYYY-MM-DD)</Label>
        <Field value={toDate} onChangeText={setToDate} />
        <ActionButton label="Actualizar lista" onPress={() => void loadData()} />
      </Card>

      <Card>
        <Text style={styles.section}>Filtros rápidos</Text>
        <View style={styles.chips}>
          <FilterChip label="Todo el equipo" active={!staffFilter} onPress={() => setStaffFilter('')} />
          {staff.map((item) => (
            <FilterChip key={item.id} label={item.name} active={staffFilter === item.id} onPress={() => setStaffFilter(item.id)} />
          ))}
        </View>
        <View style={styles.chips}>
          <FilterChip label="Todos los estados" active={!statusFilter} onPress={() => setStatusFilter('')} />
          {STATUS_OPTIONS.map((status) => (
            <FilterChip key={status} label={status} active={statusFilter === status} onPress={() => setStatusFilter(status)} />
          ))}
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <MutedText>Cargando citas...</MutedText> : null}
      {!loading && !filteredAppointments.length ? <MutedText>No hay citas para los filtros seleccionados.</MutedText> : null}

      <View style={styles.list}>
        {filteredAppointments.map((item) => (
          <Card key={item.id}>
            <Text style={styles.itemTitle}>{formatDateTime(item.start_at)}</Text>
            <Text style={styles.itemMeta}>{item.customer_name} - {item.customer_phone || '-'}</Text>
            <Text style={styles.itemMeta}>{item.service_name} - {item.staff_name}</Text>
            <Text style={styles.itemMeta}>
              Estado: {item.status} - Pago: {PAYMENT_STATUS_LABEL[item.payment_status || ''] || (item.payment_status || 'sin pago')} - {formatCurrency(item.price_cents)}
            </Text>
            <Label>Precio override (pesos UYU, opcional)</Label>
            <Field
              value={priceOverrides[item.id] || ''}
              onChangeText={(value) => setPriceOverrides((current) => ({ ...current, [item.id]: value }))}
              keyboardType="numeric"
              placeholder="Ej: 450"
            />
            <View style={styles.actions}>
              {STATUS_OPTIONS.map((status) => (
                <Pressable
                  key={status}
                  style={[styles.statusButton, item.status === status ? styles.statusButtonActive : null]}
                  onPress={() => void updateStatus(item.id, status)}
                  disabled={savingId === item.id}
                >
                  <Text style={[styles.statusButtonText, item.status === status ? styles.statusButtonTextActive : null]}>
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.filterChip, active ? styles.filterChipActive : null]} onPress={onPress}>
      <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  filterChipText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  list: {
    gap: 8,
  },
  itemTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  statusButtonActive: {
    borderColor: palette.accent,
    backgroundColor: '#fff7e6',
  },
  statusButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: '#92400e',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
});
