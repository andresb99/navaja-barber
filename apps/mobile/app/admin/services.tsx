import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { parseCurrencyInputToCents, serviceUpsertSchema } from '@navaja/shared';
import {
  ActionButton,
  Card,
  ErrorText,
  Field,
  Label,
  MutedText,
  Screen,
  SurfaceCard,
} from '../../components/ui/primitives';
import {
  createAdminServiceViaApi,
  hasExternalApi,
  listAdminServicesViaApi,
} from '../../lib/api';
import { getAccessToken, getAuthContext } from '../../lib/auth';
import { formatCurrency } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

interface ServiceItem {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
}

export default function AdminServicesScreen() {
  const { colors } = useNavajaTheme();
  const [allowed, setAllowed] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');

  const [name, setName] = useState('');
  const [priceUy, setPriceUy] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');

  const loadServices = useCallback(async () => {
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

    const accessToken = await getAccessToken();
    if (hasExternalApi && accessToken) {
      const response = await listAdminServicesViaApi({
        accessToken,
        shopId: auth.shopId,
      });

      if (!response) {
        setLoading(false);
        setServices([]);
        setError('No se pudo conectar con la API de servicios.');
        return;
      }

      setServices(response.items);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('services')
      .select('id, name, price_cents, duration_minutes, is_active')
      .eq('shop_id', auth.shopId)
      .order('name');

    if (fetchError) {
      setLoading(false);
      setServices([]);
      setError(fetchError.message);
      return;
    }

    setServices(
      (data || []).map((item) => ({
        id: String(item.id),
        name: String(item.name),
        price_cents: Number(item.price_cents || 0),
        duration_minutes: Number(item.duration_minutes || 0),
        is_active: Boolean(item.is_active),
      })),
    );
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadServices();
    }, [loadServices]),
  );

  async function createService() {
    const auth = await getAuthContext();
    if (auth.role !== 'admin' || !auth.shopId) {
      setError('No tienes una barberia activa para crear servicios.');
      return;
    }

    const parsed = serviceUpsertSchema.safeParse({
      shop_id: auth.shopId,
      name,
      price_cents: parseCurrencyInputToCents(priceUy),
      duration_minutes: Number(durationMinutes),
      is_active: true,
    });

    if (!parsed.success) {
      setError('Revisa los datos del servicio.');
      return;
    }

    setSaving(true);
    setError(null);

    const accessToken = await getAccessToken();
    if (!hasExternalApi || !accessToken) {
      setSaving(false);
      setError(
        'Configura EXPO_PUBLIC_API_BASE_URL e inicia sesion para gestionar servicios con la misma logica de la web.',
      );
      return;
    }

    try {
      await createAdminServiceViaApi({
        accessToken,
        payload: parsed.data,
      });
    } catch (cause) {
      setSaving(false);
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el servicio.');
      return;
    }

    setSaving(false);
    setName('');
    setPriceUy('');
    setDurationMinutes('');
    await loadServices();
  }

  if (!allowed && !loading) {
    return (
      <Screen title="Servicios" subtitle="Acceso restringido">
        <Card>
          <Text style={styles.error}>No tienes permisos de admin.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Servicios"
      subtitle={workspaceName ? `Alta y gestion de catalogo · ${workspaceName}` : 'Alta y gestion de catalogo'}
    >
      <Card>
        <Text style={[styles.section, { color: colors.text }]}>Agregar servicio</Text>
        <Label>Nombre</Label>
        <Field value={name} onChangeText={setName} />
        <Label>Precio (pesos UYU)</Label>
        <Field value={priceUy} onChangeText={setPriceUy} keyboardType="numeric" />
        <Label>Duracion (minutos)</Label>
        <Field value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="numeric" />
        <ErrorText message={error} />
        <ActionButton
          label={saving ? 'Guardando...' : 'Guardar servicio'}
          onPress={() => void createService()}
          disabled={!name || !priceUy || !durationMinutes || saving}
          loading={saving}
        />
      </Card>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>Servicios actuales</Text>
        {loading ? <MutedText>Cargando servicios...</MutedText> : null}
        {!loading && services.length === 0 ? <MutedText>No hay servicios.</MutedText> : null}
        <View style={styles.list}>
          {services.map((item) => (
            <SurfaceCard key={item.id} style={styles.itemCard} contentStyle={styles.itemCardContent}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                {formatCurrency(item.price_cents)} - {item.duration_minutes} min - {item.is_active ? 'Activo' : 'Inactivo'}
              </Text>
            </SurfaceCard>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  itemCard: {
    padding: 0,
  },
  itemCardContent: {
    gap: 3,
  },
  itemTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  itemMeta: {
    fontSize: 12,
  },
  error: {
    fontSize: 13,
  },
});
