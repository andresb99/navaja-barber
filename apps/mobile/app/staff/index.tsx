import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SurfaceCard } from '../../components/ui/primitives';
import { Card, Chip, ErrorText, MutedText, Screen } from '../../components/ui/primitives';
import { getStaffContext } from '../../lib/auth';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

interface StaffAppointment {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  payment_status: string | null;
  price_cents: number;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  staff_name: string;
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'pendiente',
  processing: 'procesando',
  approved: 'aprobado',
  rejected: 'rechazado',
  cancelled: 'cancelado',
  refunded: 'devuelto',
  expired: 'vencido',
};

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
  const { colors } = useNavajaTheme();
  const [appointments, setAppointments] = useState<StaffAppointment[]>([]);
  const [staffName, setStaffName] = useState('');
  const [shopName, setShopName] = useState('');
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
    setShopName(staff.shopName);
    setRole(staff.role);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    let query = supabase
      .from('appointments')
      .select('id, start_at, end_at, status, price_cents, customer_name_snapshot, customer_phone_snapshot, customers(name, phone), services(name), staff(name), payment_intents(status)')
      .eq('shop_id', staff.shopId)
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
        payment_status: (item.payment_intents as { status?: string } | null)?.status
          ? String((item.payment_intents as { status?: string } | null)?.status)
          : null,
        price_cents: Number(item.price_cents || 0),
        customer_name: String(
          (item as { customer_name_snapshot?: string | null }).customer_name_snapshot ||
            (item.customers as { name?: string } | null)?.name ||
            'Invitado',
        ),
        customer_phone: String(
          (item as { customer_phone_snapshot?: string | null }).customer_phone_snapshot ||
            (item.customers as { phone?: string } | null)?.phone ||
            '',
        ),
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
    <Screen
      title="Panel staff"
      subtitle={shopName ? `Agenda de los proximos 7 dias - ${shopName}` : 'Agenda de los proximos 7 dias'}
    >
      <Card>
        <Text style={[styles.title, { color: colors.text }]}>{staffName || 'Sin sesion'}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Rol: {role === 'admin' ? 'Admin' : 'Staff'}
        </Text>
      </Card>

      <Card>
        <Text style={[styles.title, { color: colors.text }]}>Acciones rapidas</Text>
        <View style={styles.quickActions}>
          <SurfaceCard onPress={() => router.push('/staff/citas')} style={styles.quickCard}>
            <Text style={[styles.quickTitle, { color: colors.text }]}>Mis citas</Text>
            <Text style={[styles.quickDesc, { color: colors.textMuted }]}>
              Agenda, walk-ins y cierre de estados.
            </Text>
          </SurfaceCard>
          <SurfaceCard onPress={() => router.push('/staff/metricas')} style={styles.quickCard}>
            <Text style={[styles.quickTitle, { color: colors.text }]}>Mis metricas</Text>
            <Text style={[styles.quickDesc, { color: colors.textMuted }]}>
              Facturacion, ocupacion, ticket y resenas.
            </Text>
          </SurfaceCard>
          <SurfaceCard onPress={() => router.push('/staff/ausencias')} style={styles.quickCard}>
            <Text style={[styles.quickTitle, { color: colors.text }]}>Mis ausencias</Text>
            <Text style={[styles.quickDesc, { color: colors.textMuted }]}>
              Solicitar tiempo libre y ver historial.
            </Text>
          </SurfaceCard>
        </View>
      </Card>

      <ErrorText message={error} />
      {loading ? <MutedText>Cargando agenda...</MutedText> : null}
      {!loading && appointments.length === 0 ? <MutedText>No hay citas en este periodo.</MutedText> : null}

      <View style={styles.list}>
        {appointments.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/appointment/${item.id}`)}>
            <Card>
              <View style={styles.row}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>
                  {formatDateTime(item.start_at)}
                </Text>
                <Chip label={item.status} tone={toneForStatus(item.status)} />
              </View>
              <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                {item.customer_name} - {item.customer_phone || '-'}
              </Text>
              <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                {item.service_name} - {formatCurrency(item.price_cents)}
              </Text>
              <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                Pago:{' '}
                {PAYMENT_STATUS_LABEL[item.payment_status || ''] ||
                  (item.payment_status || 'sin pago')}
              </Text>
              {role === 'admin' ? (
                <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                  Barbero: {item.staff_name || '-'}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
  },
  quickActions: {
    gap: 8,
  },
  quickCard: {
    padding: 14,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
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
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  itemMeta: {
    fontSize: 12,
  },
});
