import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ActionButton, Card, Chip, MutedText, Screen } from '../../components/ui/primitives';
import { AppRole, getAuthContext } from '../../lib/auth';
import { env } from '../../lib/env';
import { formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface MyAppointment {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  service_name: string | null;
  staff_name: string | null;
}

const roleLabel: Record<AppRole, string> = {
  guest: 'Invitado',
  user: 'Usuario',
  staff: 'Staff',
  admin: 'Admin',
};

const toneByRole: Record<AppRole, 'neutral' | 'success' | 'warning' | 'danger'> = {
  guest: 'neutral',
  user: 'neutral',
  staff: 'warning',
  admin: 'success',
};

export default function CuentaScreen() {
  const [role, setRole] = useState<AppRole>('guest');
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [appointments, setAppointments] = useState<MyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError(null);

    const auth = await getAuthContext();
    setRole(auth.role);
    setEmail(auth.email || '');

    if (auth.userId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, phone')
        .eq('auth_user_id', auth.userId)
        .maybeSingle();

      setFullName(String(profile?.full_name || ''));
      setPhone(String(profile?.phone || ''));
    } else {
      setFullName('');
      setPhone('');
    }

    if (auth.role === 'user' || auth.role === 'staff' || auth.role === 'admin') {
      const { data, error: rpcError } = await supabase.rpc('get_my_appointments', {
        p_shop_id: env.EXPO_PUBLIC_SHOP_ID,
      });

      if (rpcError) {
        setAppointments([]);
        setError(rpcError.message);
      } else {
        setAppointments(
          (data || []).map((item: Record<string, unknown>) => ({
            id: String(item.id),
            start_at: String(item.start_at),
            end_at: String(item.end_at),
            status: String(item.status),
            service_name: item.service_name ? String(item.service_name) : null,
            staff_name: item.staff_name ? String(item.staff_name) : null,
          })),
        );
      }
    } else {
      setAppointments([]);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAccount();
    }, [loadAccount]),
  );

  async function signOut() {
    await supabase.auth.signOut();
    await loadAccount();
  }

  return (
    <Screen title="Cuenta" subtitle="Estado de sesión y acceso por rol">
      <Card>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
          <Chip label={roleLabel[role]} tone={toneByRole[role]} />
        </View>
        <Text style={styles.item}>Email: {email || 'Sin sesión'}</Text>
        <Text style={styles.item}>Nombre: {fullName || 'No configurado'}</Text>
        <Text style={styles.item}>Teléfono: {phone || 'No configurado'}</Text>

        <View style={styles.actions}>
          {role === 'guest' ? (
            <ActionButton label="Ingresar o registrarme" onPress={() => router.push('/(auth)/login')} />
          ) : (
            <ActionButton label="Cerrar sesión" variant="danger" onPress={signOut} />
          )}
          {(role === 'staff' || role === 'admin') ? (
            <ActionButton label="Ir a panel staff" variant="secondary" onPress={() => router.push('/staff/index')} />
          ) : null}
          {role === 'admin' ? (
            <ActionButton label="Ir a panel admin" variant="secondary" onPress={() => router.push('/admin/index')} />
          ) : null}
        </View>
      </Card>

      <Card>
        <Text style={styles.title}>Mis reservas</Text>
        {loading ? <MutedText>Cargando...</MutedText> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !appointments.length ? (
          <MutedText>No encontramos reservas asociadas a tu cuenta.</MutedText>
        ) : null}

        <View style={styles.list}>
          {appointments.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(`/appointment/${item.id}`)} style={styles.appointmentCard}>
              <Text style={styles.appointmentTitle}>{formatDateTime(item.start_at)}</Text>
              <Text style={styles.appointmentMeta}>
                {item.service_name || 'Servicio'} - {item.staff_name || 'Sin asignar'}
              </Text>
              <Text style={styles.appointmentMeta}>Estado: {item.status}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  item: {
    color: '#334155',
    fontSize: 13,
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
  list: {
    gap: 8,
  },
  appointmentCard: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  appointmentTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  appointmentMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
});
