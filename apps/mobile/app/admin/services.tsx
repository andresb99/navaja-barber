import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { parseCurrencyInputToCents, serviceUpsertSchema } from '@navaja/shared';
import { ActionButton, Card, ErrorText, Field, Label, MutedText, Screen } from '../../components/ui/primitives';
import {
  createAdminServiceViaApi,
  hasExternalApi,
  listAdminServicesViaApi,
} from '../../lib/api';
import { getAccessToken, getAuthContext } from '../../lib/auth';
import { formatCurrency } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface ServiceItem {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
}

export default function AdminServicesScreen() {
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
    if (hasExternalApi && accessToken) {
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
      return;
    }

    const { error: insertError } = await supabase.from('services').insert(parsed.data);
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
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
        <Text style={styles.section}>Agregar servicio</Text>
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
        <Text style={styles.section}>Servicios actuales</Text>
        {loading ? <MutedText>Cargando servicios...</MutedText> : null}
        {!loading && services.length === 0 ? <MutedText>No hay servicios.</MutedText> : null}
        <View style={styles.list}>
          {services.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {formatCurrency(item.price_cents)} - {item.duration_minutes} min - {item.is_active ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          ))}
        </View>
      </Card>
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
    fontWeight: '700',
    fontSize: 14,
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
