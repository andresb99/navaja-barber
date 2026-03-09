import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ActionButton,
  Card,
  Chip,
  ErrorText,
  MutedText,
  Screen,
  SurfaceCard,
} from '../../components/ui/primitives';
import { getAuthContext, type AppRole } from '../../lib/auth';
import { saveActiveWorkspaceStaffId, type StaffWorkspace } from '../../lib/workspace';
import { palette } from '../../lib/theme';

function roleLabel(role: AppRole | 'admin' | 'staff') {
  if (role === 'admin') {
    return 'Admin';
  }
  if (role === 'staff') {
    return 'Staff';
  }
  if (role === 'user') {
    return 'Cliente';
  }
  return 'Invitado';
}

export default function MisBarberiasScreen() {
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>('guest');
  const [userId, setUserId] = useState('');
  const [activeStaffId, setActiveStaffId] = useState('');
  const [workspaces, setWorkspaces] = useState<StaffWorkspace[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const auth = await getAuthContext();
    setRole(auth.role);
    setUserId(auth.userId || '');
    setActiveStaffId(auth.staffId || '');
    setWorkspaces(auth.workspaces);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function activateWorkspace(workspace: StaffWorkspace) {
    if (!userId) {
      setError('Debes iniciar sesion para cambiar de barberia.');
      return;
    }

    setSwitchingId(workspace.staffId);
    setError(null);
    setMessage(null);

    try {
      await saveActiveWorkspaceStaffId(userId, workspace.staffId);
      setActiveStaffId(workspace.staffId);
      setRole(workspace.role);
      setMessage(`Workspace activo: ${workspace.shopName}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el workspace activo.');
    } finally {
      setSwitchingId(null);
    }
  }

  function openWorkspaceHome() {
    if (role === 'admin') {
      router.replace('/admin');
      return;
    }

    if (role === 'staff') {
      router.replace('/staff');
      return;
    }

    router.replace('/(tabs)/cuenta');
  }

  return (
    <Screen
      title="Mis barberias"
      subtitle="Selecciona con que barberia quieres operar en mobile. El panel admin/staff usa este contexto."
    >
      <ErrorText message={error} />
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <Card>
        <Text style={styles.section}>Contexto actual</Text>
        <Text style={styles.meta}>Rol activo: {roleLabel(role)}</Text>
        {loading ? <MutedText>Cargando barberias...</MutedText> : null}
        {!loading && workspaces.length === 0 ? (
          <MutedText>No tienes barberias activas asociadas a tu usuario.</MutedText>
        ) : null}
        {!loading && workspaces.length > 0 ? (
          <ActionButton label="Ir al panel activo" onPress={openWorkspaceHome} />
        ) : null}
      </Card>

      <View style={styles.list}>
        {workspaces.map((workspace) => {
          const active = workspace.staffId === activeStaffId;

          return (
            <SurfaceCard
              key={workspace.staffId}
              active={active}
              onPress={() => {
                void activateWorkspace(workspace);
              }}
            >
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.name}>{workspace.shopName}</Text>
                  <Text style={styles.meta}>
                    {workspace.staffName} · {roleLabel(workspace.role)}
                  </Text>
                  <Text style={styles.meta}>Slug: {workspace.shopSlug || 'sin-slug'}</Text>
                </View>
                {active ? <Chip label="Activa" tone="success" /> : null}
              </View>
              <ActionButton
                label={active ? 'Workspace activo' : 'Usar esta barberia'}
                variant={active ? 'secondary' : 'primary'}
                disabled={switchingId === workspace.staffId || active}
                loading={switchingId === workspace.staffId}
                onPress={() => {
                  void activateWorkspace(workspace);
                }}
              />
            </SurfaceCard>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
  },
  success: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '600',
  },
});
