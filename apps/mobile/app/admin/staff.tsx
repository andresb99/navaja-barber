import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { staffUpsertSchema, timeOffUpsertSchema, workingHoursUpsertSchema } from '@navaja/shared';
import { ActionButton, Card, ErrorText, Field, Label, MutedText, Screen } from '../../components/ui/primitives';
import {
  createAdminStaffResourceViaApi,
  hasExternalApi,
  listAdminStaffResourcesViaApi,
} from '../../lib/api';
import { getAccessToken, getAuthContext } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface StaffItem {
  id: string;
  name: string;
  role: 'admin' | 'staff';
  phone: string;
  is_active: boolean;
}

interface WorkingHourItem {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  staff_name: string;
}

interface TimeOffItem {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  reason: string;
  staff_name: string;
}

const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function AdminStaffScreen() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHourItem[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffItem[]>([]);

  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState<'admin' | 'staff'>('staff');
  const [authUserId, setAuthUserId] = useState('');

  const [workingStaffId, setWorkingStaffId] = useState('');
  const [workingDay, setWorkingDay] = useState('1');
  const [workingStart, setWorkingStart] = useState('09:00');
  const [workingEnd, setWorkingEnd] = useState('17:00');

  const [timeOffStaffId, setTimeOffStaffId] = useState('');
  const [timeOffStart, setTimeOffStart] = useState('');
  const [timeOffEnd, setTimeOffEnd] = useState('');
  const [timeOffReason, setTimeOffReason] = useState('');

  const [saving, setSaving] = useState(false);

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

    const accessToken = await getAccessToken();
    if (hasExternalApi && accessToken) {
      const response = await listAdminStaffResourcesViaApi({
        accessToken,
        shopId: auth.shopId,
      });

      if (!response) {
        setLoading(false);
        setError('No se pudo conectar con la API del equipo.');
        return;
      }

      setStaff(
        response.staff.map((item) => ({
          id: item.id,
          name: item.name,
          role: (item.role as 'admin' | 'staff') || 'staff',
          phone: item.phone,
          is_active: item.is_active,
        })),
      );
      setWorkingHours(
        response.working_hours.map((item) => ({
          id: item.id,
          staff_id: item.staff_id,
          day_of_week: item.day_of_week,
          start_time: item.start_time,
          end_time: item.end_time,
          staff_name: item.staff_name,
        })),
      );
      setTimeOff(
        response.time_off.map((item) => ({
          id: item.id,
          staff_id: item.staff_id,
          start_at: item.start_at,
          end_at: item.end_at,
          reason: item.reason,
          staff_name: item.staff_name,
        })),
      );
      setLoading(false);
      return;
    }

    const [{ data: staffRows, error: staffError }, { data: whRows }, { data: timeOffRows }] = await Promise.all([
      supabase
        .from('staff')
        .select('id, name, role, phone, is_active')
        .eq('shop_id', auth.shopId)
        .order('name'),
      supabase
        .from('working_hours')
        .select('id, staff_id, day_of_week, start_time, end_time, staff(name)')
        .eq('shop_id', auth.shopId)
        .order('day_of_week'),
      supabase
        .from('time_off')
        .select('id, staff_id, start_at, end_at, reason, staff(name)')
        .eq('shop_id', auth.shopId)
        .order('start_at', { ascending: false })
        .limit(20),
    ]);

    if (staffError) {
      setLoading(false);
      setError(staffError.message);
      return;
    }

    setStaff(
      (staffRows || []).map((item) => ({
        id: String(item.id),
        name: String(item.name),
        role: (item.role as 'admin' | 'staff') || 'staff',
        phone: String(item.phone),
        is_active: Boolean(item.is_active),
      })),
    );

    setWorkingHours(
      (whRows || []).map((item) => ({
        id: String(item.id),
        staff_id: String(item.staff_id),
        day_of_week: Number(item.day_of_week || 0),
        start_time: String(item.start_time || ''),
        end_time: String(item.end_time || ''),
        staff_name: String((item.staff as { name?: string } | null)?.name || 'Staff'),
      })),
    );

    setTimeOff(
      (timeOffRows || []).map((item) => ({
        id: String(item.id),
        staff_id: String(item.staff_id),
        start_at: String(item.start_at),
        end_at: String(item.end_at),
        reason: String(item.reason || ''),
        staff_name: String((item.staff as { name?: string } | null)?.name || 'Staff'),
      })),
    );

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function createStaff() {
    const auth = await getAuthContext();
    if (auth.role !== 'admin' || !auth.shopId) {
      setError('No tienes una barberia activa para crear staff.');
      return;
    }

    const parsed = staffUpsertSchema.safeParse({
      shop_id: auth.shopId,
      auth_user_id: authUserId || null,
      name: staffName,
      role: staffRole,
      phone: staffPhone,
      is_active: true,
    });

    if (!parsed.success) {
      setError('Revisa los datos del personal.');
      return;
    }

    setSaving(true);
    const accessToken = await getAccessToken();
    if (hasExternalApi && accessToken) {
      try {
        await createAdminStaffResourceViaApi({
          accessToken,
          payload: {
            action: 'staff',
            payload: parsed.data,
          },
        });
      } catch (cause) {
        setSaving(false);
        setError(cause instanceof Error ? cause.message : 'No se pudo crear el staff.');
        return;
      }

      setSaving(false);
      setStaffName('');
      setStaffPhone('');
      setStaffRole('staff');
      setAuthUserId('');
      await loadData();
      return;
    }

    const { error: insertError } = await supabase.from('staff').insert(parsed.data);
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    setSaving(false);
    setStaffName('');
    setStaffPhone('');
    setStaffRole('staff');
    setAuthUserId('');
    await loadData();
  }

  async function createWorkingHours() {
    const auth = await getAuthContext();
    if (auth.role !== 'admin' || !auth.shopId) {
      setError('No tienes una barberia activa para guardar horarios.');
      return;
    }

    const parsed = workingHoursUpsertSchema.safeParse({
      shop_id: auth.shopId,
      staff_id: workingStaffId,
      day_of_week: Number(workingDay),
      start_time: workingStart,
      end_time: workingEnd,
    });

    if (!parsed.success) {
      setError('Revisa el horario laboral.');
      return;
    }

    setSaving(true);
    const accessToken = await getAccessToken();
    if (hasExternalApi && accessToken) {
      try {
        await createAdminStaffResourceViaApi({
          accessToken,
          payload: {
            action: 'working_hours',
            payload: parsed.data,
          },
        });
      } catch (cause) {
        setSaving(false);
        setError(cause instanceof Error ? cause.message : 'No se pudo guardar el horario.');
        return;
      }

      setSaving(false);
      await loadData();
      return;
    }

    const { error: insertError } = await supabase.from('working_hours').insert(parsed.data);
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    setSaving(false);
    await loadData();
  }

  async function createTimeOff() {
    const auth = await getAuthContext();
    if (auth.role !== 'admin' || !auth.shopId) {
      setError('No tienes una barberia activa para guardar bloqueos.');
      return;
    }

    const parsed = timeOffUpsertSchema.safeParse({
      shop_id: auth.shopId,
      staff_id: timeOffStaffId,
      start_at: timeOffStart,
      end_at: timeOffEnd,
      reason: timeOffReason || null,
    });

    if (!parsed.success) {
      setError('Revisa el bloqueo de agenda.');
      return;
    }

    setSaving(true);
    const accessToken = await getAccessToken();
    if (hasExternalApi && accessToken) {
      try {
        await createAdminStaffResourceViaApi({
          accessToken,
          payload: {
            action: 'time_off',
            payload: parsed.data,
          },
        });
      } catch (cause) {
        setSaving(false);
        setError(cause instanceof Error ? cause.message : 'No se pudo guardar el bloqueo.');
        return;
      }

      setSaving(false);
      setTimeOffReason('');
      await loadData();
      return;
    }

    const { error: insertError } = await supabase.from('time_off').insert(parsed.data);
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    setSaving(false);
    setTimeOffReason('');
    await loadData();
  }

  if (!allowed && !loading) {
    return (
      <Screen title="Equipo" subtitle="Acceso restringido">
        <Card>
          <Text style={styles.error}>No tienes permisos de admin.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Equipo" subtitle="Gestión de staff, horarios y bloqueos">
      <ErrorText message={error} />

      <Card>
        <Text style={styles.section}>Alta de personal</Text>
        <Label>Nombre</Label>
        <Field value={staffName} onChangeText={setStaffName} />
        <Label>Teléfono</Label>
        <Field value={staffPhone} onChangeText={setStaffPhone} />
        <Label>auth_user_id (opcional)</Label>
        <Field value={authUserId} onChangeText={setAuthUserId} />
        <Label>Rol</Label>
        <View style={styles.row}>
          <RoleChip label="staff" active={staffRole === 'staff'} onPress={() => setStaffRole('staff')} />
          <RoleChip label="admin" active={staffRole === 'admin'} onPress={() => setStaffRole('admin')} />
        </View>
        <ActionButton
          label={saving ? 'Guardando...' : 'Guardar personal'}
          onPress={() => void createStaff()}
          disabled={!staffName || !staffPhone || saving}
          loading={saving}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Horarios laborales</Text>
        <Label>Staff ID</Label>
        <Field value={workingStaffId} onChangeText={setWorkingStaffId} placeholder="Pega el staff_id" />
        <Label>Día de semana (0-6)</Label>
        <Field value={workingDay} onChangeText={setWorkingDay} keyboardType="numeric" />
        <Label>Hora inicio (HH:MM)</Label>
        <Field value={workingStart} onChangeText={setWorkingStart} />
        <Label>Hora fin (HH:MM)</Label>
        <Field value={workingEnd} onChangeText={setWorkingEnd} />
        <ActionButton
          label="Guardar horario"
          onPress={() => void createWorkingHours()}
          disabled={!workingStaffId || !workingStart || !workingEnd || saving}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Bloqueos de agenda</Text>
        <Label>Staff ID</Label>
        <Field value={timeOffStaffId} onChangeText={setTimeOffStaffId} />
        <Label>Inicio (ISO)</Label>
        <Field value={timeOffStart} onChangeText={setTimeOffStart} placeholder="2026-02-24T10:00:00Z" />
        <Label>Fin (ISO)</Label>
        <Field value={timeOffEnd} onChangeText={setTimeOffEnd} placeholder="2026-02-24T12:00:00Z" />
        <Label>Motivo</Label>
        <Field value={timeOffReason} onChangeText={setTimeOffReason} />
        <ActionButton
          label="Guardar bloqueo"
          onPress={() => void createTimeOff()}
          disabled={!timeOffStaffId || !timeOffStart || !timeOffEnd || saving}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Staff actual</Text>
        {loading ? <MutedText>Cargando...</MutedText> : null}
        <View style={styles.list}>
          {staff.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemTitle}>{item.name} ({item.role})</Text>
              <Text style={styles.itemMeta}>{item.phone} - {item.is_active ? 'Activo' : 'Inactivo'}</Text>
              <Text style={styles.itemMeta}>ID: {item.id}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Horarios configurados</Text>
        <View style={styles.list}>
          {workingHours.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemTitle}>{item.staff_name}</Text>
              <Text style={styles.itemMeta}>
                {weekdays[item.day_of_week] || item.day_of_week} - {item.start_time} a {item.end_time}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Bloqueos recientes</Text>
        <View style={styles.list}>
          {timeOff.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemTitle}>{item.staff_name}</Text>
              <Text style={styles.itemMeta}>
                {formatDateTime(item.start_at)} - {formatDateTime(item.end_at)}
              </Text>
              <Text style={styles.itemMeta}>{item.reason || 'Sin motivo'}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

function RoleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.roleChip, active ? styles.roleChipActive : null]} onPress={onPress}>
      <Text style={[styles.roleChipText, active ? styles.roleChipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  roleChipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  roleChipText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
  },
  roleChipTextActive: {
    color: '#fff',
  },
  list: {
    gap: 8,
  },
  item: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  itemTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
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
