import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Card, Chip, MutedText, Screen } from '../../components/ui/primitives';
import { getStaffContext } from '../../lib/auth';
import { env } from '../../lib/env';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface StaffAppointment {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  price_cents: number;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  staff_name: string;
}

function toneForStatus(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'done') {
    return 'success';
  }
  if (status === 'pending') {
    return 'warning';
  }
  if (status === 'cancelled' || status === 'no_show') {
    return 'danger';
  }
  return 'neutral';
}

export default function StaffPanelScreen() {
  const [appointments, setAppointments] = useState<StaffAppointment[]>([]);
  const [staffName, setStaffName] = useState('');
  const [role, setRole] = useState<'admin' | 'staff' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const staff = await getStaffContext();
    if (!staff) {
      setLoading(false);
      router.replace('/(auth)/login');
      return;
    }

    setStaffName(staff.name);
    setRole(staff.role);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    let query = supabase
      .from('appointments')
      .select('id, start_at, end_at, status, price_cents, customers(name, phone), services(name), staff(name)')
      .eq('shop_id', env.EXPO_PUBLIC_SHOP_ID)
      .gte('start_at', start.toISOString())
      .lt('start_at', end.toISOString())
      .order('start_at');

    if (staff.role !== 'admin') {
      query = query.eq('staff_id', staff.staffId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setLoading(false);
      setAppointments([]);
      setError(fetchError.message);
      return;
    }

    setAppointments(
      (data || []).map((item) => ({
        id: String(item.id),
        start_at: String(item.start_at),
        end_at: String(item.end_at),
        status: String(item.status),
        price_cents: Number(item.price_cents || 0),
        customer_name: String((item.customers as { name?: string } | null)?.name || 'Invitado'),
        customer_phone: String((item.customers as { phone?: string } | null)?.phone || ''),
        service_name: String((item.services as { name?: string } | null)?.name || 'Servicio'),
        staff_name: String((item.staff as { name?: string } | null)?.name || ''),
      })),
    );
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  return (
    <Screen title="Panel staff" subtitle="Agenda de los próximos 7 días">
      <Card>
        <Text style={styles.title}>{staffName || 'Sin sesión'}</Text>
        <Text style={styles.subtitle}>Rol: {role === 'admin' ? 'Admin' : 'Staff'}</Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <MutedText>Cargando agenda...</MutedText> : null}
      {!loading && appointments.length === 0 ? <MutedText>No hay citas en este período.</MutedText> : null}

      <View style={styles.list}>
        {appointments.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/appointment/${item.id}`)}>
            <Card>
              <View style={styles.row}>
                <Text style={styles.itemTitle}>{formatDateTime(item.start_at)}</Text>
                <Chip label={item.status} tone={toneForStatus(item.status)} />
              </View>
              <Text style={styles.itemMeta}>{item.customer_name} - {item.customer_phone || '-'}</Text>
              <Text style={styles.itemMeta}>
                {item.service_name} - {formatCurrency(item.price_cents)}
              </Text>
              {role === 'admin' ? <Text style={styles.itemMeta}>Barbero: {item.staff_name || '-'}</Text> : null}
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  list: {
    gap: 8,
  },
  itemTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  itemMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
});
