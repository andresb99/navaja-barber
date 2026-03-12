import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  ActionButton,
  Card,
  ErrorText,
  Field,
  Label,
  MutedText,
  MultilineField,
  Screen,
} from '../../components/ui/primitives';
import { hasExternalApi, updateAdminBarbershopViaApi } from '../../lib/api';
import { getAccessToken, getAuthContext } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminBarbershopScreen() {
  const { colors } = useNavajaTheme();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [countryCode, setCountryCode] = useState('UY');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const auth = await getAuthContext();
    if (auth.role !== 'admin' || !auth.shopId) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);
    const resolvedShopId = String(auth.shopId || '').trim();

    setActiveShopId(resolvedShopId);

    const [{ data: shop, error: shopError }, { data: location, error: locationError }] =
      await Promise.all([
        supabase
          .from('shops')
          .select('name, slug, timezone, phone, description')
          .eq('id', resolvedShopId)
          .maybeSingle(),
        supabase
          .from('shop_locations')
          .select('label, city, region, country_code, latitude, longitude')
          .eq('shop_id', resolvedShopId)
          .maybeSingle(),
      ]);

    if (shopError) {
      setError(shopError.message);
      setLoading(false);
      return;
    }

    if (locationError) {
      setError(locationError.message);
      setLoading(false);
      return;
    }

    setName(String(shop?.name || ''));
    setSlug(String(shop?.slug || ''));
    setTimezone(String(shop?.timezone || 'UTC'));
    setPhone(String(shop?.phone || ''));
    setDescription(String(shop?.description || ''));
    setLocationLabel(String(location?.label || ''));
    setCity(String(location?.city || ''));
    setRegion(String(location?.region || ''));
    setCountryCode(String(location?.country_code || 'UY'));
    setLatitude(
      location?.latitude != null && Number.isFinite(Number(location.latitude))
        ? String(location.latitude)
        : '',
    );
    setLongitude(
      location?.longitude != null && Number.isFinite(Number(location.longitude))
        ? String(location.longitude)
        : '',
    );
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function saveBarbershop() {
    setSaving(true);
    setError(null);
    setMessage(null);

    if (!activeShopId) {
      setSaving(false);
      setError('No se encontro una barberia activa para actualizar.');
      return;
    }

    if (!hasExternalApi) {
      setSaving(false);
      setError(
        'Configura EXPO_PUBLIC_API_BASE_URL para editar la barberia con la misma logica de la web.',
      );
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setSaving(false);
      setError('Debes iniciar sesion para editar la barberia.');
      return;
    }

    const parsedLatitude = latitude.trim() ? Number(latitude.replace(',', '.')) : null;
    const parsedLongitude = longitude.trim() ? Number(longitude.replace(',', '.')) : null;

    if ((parsedLatitude === null) !== (parsedLongitude === null)) {
      setSaving(false);
      setError('Si completas coordenadas, debes cargar latitud y longitud.');
      return;
    }

    if (
      (parsedLatitude !== null && !Number.isFinite(parsedLatitude)) ||
      (parsedLongitude !== null && !Number.isFinite(parsedLongitude))
    ) {
      setSaving(false);
      setError('Las coordenadas deben ser numeros validos.');
      return;
    }

    const resolvedSlug = slugify(slug || name);
    if (!resolvedSlug) {
      setSaving(false);
      setError('El nombre/slug no es valido.');
      return;
    }

    try {
      await updateAdminBarbershopViaApi({
        accessToken,
        payload: {
          shop_id: activeShopId,
          shop_name: name.trim(),
          shop_slug: resolvedSlug,
          timezone: timezone.trim() || 'UTC',
          phone: phone.trim() || null,
          description: description.trim() || null,
          location_label: locationLabel.trim() || name.trim() || null,
          city: city.trim() || null,
          region: region.trim() || null,
          country_code: countryCode.trim().toUpperCase() || null,
          latitude: parsedLatitude,
          longitude: parsedLongitude,
        },
      });
    } catch (cause) {
      setSaving(false);
      setError(
        cause instanceof Error ? cause.message : 'No se pudo actualizar la barberia.',
      );
      return;
    }

    setSaving(false);
    setSlug(resolvedSlug);
    setMessage('Barberia actualizada correctamente.');
    await loadData();
  }

  if (!allowed && !loading) {
    return (
      <Screen title="Barberia" subtitle="Acceso restringido">
        <Card>
          <Text style={[styles.feedback, { color: colors.danger }]}>No tienes permisos de admin.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Barberia"
      subtitle="Configuracion basica del perfil publico y la ubicacion, usando la misma API de negocio que web."
    >
      <ErrorText message={error} />
      {message ? <Text style={[styles.feedback, { color: colors.success }]}>{message}</Text> : null}
      {loading ? <MutedText>Cargando configuracion...</MutedText> : null}

      <Card>
        <Label>Nombre</Label>
        <Field value={name} onChangeText={setName} />
        <Label>Slug publico</Label>
        <Field value={slug} onChangeText={(next) => setSlug(slugify(next))} />
        <Label>Timezone</Label>
        <Field value={timezone} onChangeText={setTimezone} />
        <Label>Telefono</Label>
        <Field value={phone} onChangeText={setPhone} />
        <Label>Descripcion</Label>
        <MultilineField value={description} onChangeText={setDescription} />
      </Card>

      <Card>
        <Label>Nombre de ubicacion</Label>
        <Field value={locationLabel} onChangeText={setLocationLabel} />
        <Label>Ciudad</Label>
        <Field value={city} onChangeText={setCity} />
        <Label>Departamento / Region</Label>
        <Field value={region} onChangeText={setRegion} />
        <Label>Pais</Label>
        <Field value={countryCode} onChangeText={(next) => setCountryCode(next.toUpperCase())} />
        <Label>Latitud (opcional)</Label>
        <Field value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" />
        <Label>Longitud (opcional)</Label>
        <Field value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" />
      </Card>

      <ActionButton
        label={saving ? 'Guardando...' : 'Guardar cambios'}
        onPress={() => {
          void saveBarbershop();
        }}
        disabled={!name || !timezone || saving}
        loading={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  feedback: {
    fontSize: 13,
    fontWeight: '600',
  },
});
