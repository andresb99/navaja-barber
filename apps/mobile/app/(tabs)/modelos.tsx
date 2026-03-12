import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { modelRegistrationInputSchema } from '@navaja/shared';
import {
  ActionButton,
  Card,
  Chip,
  ErrorText,
  Field,
  HeroPanel,
  Label,
  MutedText,
  PillToggle,
  Screen,
  StatTile,
  SurfaceCard,
} from '../../components/ui/primitives';
import { hasExternalApi, submitModelRegistrationViaApi } from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/format';
import {
  listMarketplaceOpenModelCalls,
  listMarketplaceShops,
  resolvePreferredMarketplaceShopId,
  saveMarketplaceShopId,
  type MarketplaceOpenModelCall,
  type MarketplaceShop,
} from '../../lib/marketplace';
import { useNavajaTheme } from '../../lib/theme';

const preferenceOptions = [
  { value: 'barba', label: 'Barba' },
  { value: 'pelo_largo', label: 'Pelo largo' },
  { value: 'pelo_corto', label: 'Pelo corto' },
  { value: 'rulos', label: 'Rulos' },
  { value: 'coloracion', label: 'Coloracion' },
] as const;

export default function ModelosScreen() {
  const { colors } = useNavajaTheme();
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [openCalls, setOpenCalls] = useState<MarketplaceOpenModelCall[]>([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | string>('all');
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [consentPhotos, setConsentPhotos] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        setLoadingCalls(true);
        setError(null);

        const [marketplaceShops, calls] = await Promise.all([
          listMarketplaceShops(),
          listMarketplaceOpenModelCalls(),
        ]);

        if (!active) {
          return;
        }

        setShops(marketplaceShops);
        setOpenCalls(calls);

        const preferredShopId = await resolvePreferredMarketplaceShopId(marketplaceShops);
        if (!active) {
          return;
        }

        setSelectedShopId(preferredShopId);
        setLoadingCalls(false);
      })().catch(() => {
        if (!active) {
          return;
        }

        setLoadingCalls(false);
        setError('No se pudieron cargar las convocatorias.');
      });

      return () => {
        active = false;
      };
    }, []),
  );

  const selectedCall = useMemo(
    () => openCalls.find((item) => item.sessionId === selectedSessionId) || null,
    [openCalls, selectedSessionId],
  );
  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === selectedShopId) || null,
    [selectedShopId, shops],
  );
  const visibleCalls = useMemo(() => {
    if (activeFilter === 'all') {
      return openCalls;
    }

    return openCalls.filter((call) => call.shopId === activeFilter);
  }, [activeFilter, openCalls]);

  function togglePreference(value: string) {
    setPreferences((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function selectShop(shopId: string) {
    setSelectedShopId(shopId);
    await saveMarketplaceShopId(shopId);
  }

  async function submitModelRegistration() {
    const resolvedShopId = selectedCall?.shopId || selectedShopId || undefined;
    const parsed = modelRegistrationInputSchema.safeParse({
      shop_id: resolvedShopId,
      session_id: selectedSessionId || undefined,
      full_name: fullName,
      phone,
      email: email || null,
      instagram: instagram || null,
      preferences,
      consent_photos_videos: consentPhotos,
      marketing_opt_in: marketingOptIn,
    });

    if (!parsed.success) {
      setError('Revisa los datos del formulario.');
      return;
    }

    setLoadingSubmit(true);
    setError(null);
    setSuccess(null);

    try {
      const apiResult = await submitModelRegistrationViaApi(parsed.data);
      if (!apiResult) {
        setError(
          'Configura EXPO_PUBLIC_API_BASE_URL para registrar modelos desde mobile con la misma logica de la web.',
        );
        setLoadingSubmit(false);
        return;
      }

      setSuccess('Perfil guardado. Te vamos a contactar por WhatsApp.');

      setFullName('');
      setPhone('');
      setEmail('');
      setInstagram('');
      setPreferences([]);
      setConsentPhotos(false);
      setMarketingOptIn(false);
      setSelectedSessionId('');
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'No se pudo guardar el registro.',
      );
    } finally {
      setLoadingSubmit(false);
    }
  }

  return (
    <Screen
      eyebrow="Modelos"
      title="Convocatorias abiertas de distintas barberias"
      subtitle="Replica la capa visual del marketplace web: filtros por tenant, cards de convocatorias y un formulario con el mismo tono de UI."
    >
      <HeroPanel
        eyebrow="Modelos marketplace"
        title="Postulate a convocatorias abiertas"
        description={
          hasExternalApi
            ? 'Con API externa, tu perfil queda sincronizado con el pool global y con la barberia del curso.'
            : 'Sin API externa, la app guarda el perfil en la barberia actual y mantiene el flujo funcional desde mobile.'
        }
      >
        <View style={styles.statsRow}>
          <StatTile label="Convocatorias" value={String(openCalls.length)} />
          <StatTile label="Barberias" value={String(shops.length)} />
        </View>
      </HeroPanel>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contexto de barberia</Text>
        <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
          Esta barberia se usa como destino por defecto cuando no eliges una sesion concreta.
        </Text>
        <View style={styles.chipWrap}>
          {shops.map((shop) => (
            <PillToggle
              key={shop.id}
              label={shop.name}
              active={shop.id === (selectedShop?.id || '')}
              onPress={() => {
                void selectShop(shop.id);
              }}
            />
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Convocatorias activas</Text>
        <View style={styles.chipWrap}>
          <PillToggle
            label="Todo el marketplace"
            active={activeFilter === 'all'}
            onPress={() => setActiveFilter('all')}
          />
          {shops.map((shop) => (
            <PillToggle
              key={shop.id}
              label={shop.name}
              active={activeFilter === shop.id}
              onPress={() => setActiveFilter(shop.id)}
            />
          ))}
        </View>

        {loadingCalls ? <MutedText>Cargando convocatorias...</MutedText> : null}
        {!loadingCalls && !visibleCalls.length ? (
          <MutedText>No hay convocatorias abiertas para ese filtro.</MutedText>
        ) : null}

        <View style={styles.list}>
          {visibleCalls.map((call) => {
            const selected = selectedSessionId === call.sessionId;
            const compensation =
              call.compensationType === 'gratis'
                ? 'Gratis'
                : call.compensationValueCents
                  ? formatCurrency(call.compensationValueCents)
                  : call.compensationType;

            return (
              <SurfaceCard
                key={call.sessionId}
                active={selected}
                onPress={() => {
                  setSelectedSessionId(call.sessionId);
                  if (call.shopId !== selectedShopId) {
                    void selectShop(call.shopId);
                  }
                }}
                style={styles.callCard}
              >
                <Text style={[styles.callShop, { color: colors.textMuted }]}>{call.shopName}</Text>
                <Text style={[styles.callTitle, { color: colors.text }]}>{call.courseTitle}</Text>
                <Text style={[styles.callMeta, { color: colors.textMuted }]}>
                  {formatDateTime(call.startAt)} - {call.location}
                </Text>
                <Text style={[styles.callMeta, { color: colors.textMuted }]}>
                  Cupos: {call.modelsNeeded || 'Sin definir'} - {compensation}
                </Text>
                {call.notesPublic ? (
                  <Text style={[styles.callMeta, { color: colors.textMuted }]}>
                    {call.notesPublic}
                  </Text>
                ) : null}
              </SurfaceCard>
            );
          })}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tu perfil</Text>
        <Label>Nombre y apellido</Label>
        <Field value={fullName} onChangeText={setFullName} />
        <Label>Telefono</Label>
        <Field value={phone} onChangeText={setPhone} />
        <Label>Email (opcional)</Label>
        <Field
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Label>Instagram (opcional)</Label>
        <Field value={instagram} onChangeText={setInstagram} />

        <Label>Sesion seleccionada</Label>
        <Text style={[styles.selectedSessionText, { color: colors.text }]}>
          {selectedCall
            ? `${selectedCall.shopName} - ${selectedCall.courseTitle} - ${formatDateTime(selectedCall.startAt)}`
            : selectedShop
              ? `Sin sesion. El perfil quedara asociado a ${selectedShop.name}.`
              : 'Sin sesion y sin barberia activa.'}
        </Text>

        <Label>Preferencias (opcional)</Label>
        <View style={styles.chipWrap}>
          {preferenceOptions.map((option) => (
            <PillToggle
              key={option.value}
              label={option.label}
              active={preferences.includes(option.value)}
              onPress={() => togglePreference(option.value)}
            />
          ))}
        </View>

        <View style={styles.inline}>
          <Pressable onPress={() => setConsentPhotos((value) => !value)}>
            <Chip
              label={consentPhotos ? 'Acepta fotos/video' : 'Sin consentimiento multimedia'}
              tone={consentPhotos ? 'success' : 'neutral'}
            />
          </Pressable>
          <Pressable onPress={() => setMarketingOptIn((value) => !value)}>
            <Chip
              label={marketingOptIn ? 'Acepta novedades' : 'Sin novedades'}
              tone={marketingOptIn ? 'success' : 'neutral'}
            />
          </Pressable>
        </View>

        <ErrorText message={error} />
        {success ? <Text style={[styles.success, { color: colors.success }]}>{success}</Text> : null}
        <ActionButton
          label={loadingSubmit ? 'Enviando...' : 'Guardar mi perfil'}
          onPress={submitModelRegistration}
          disabled={!fullName || !phone || loadingSubmit}
          loading={loadingSubmit}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: 8,
  },
  callCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 3,
  },
  callShop: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  callTitle: {
    fontWeight: '800',
    fontSize: 15,
  },
  callMeta: {
    fontSize: 12,
  },
  selectedSessionText: {
    fontSize: 13,
    marginBottom: 2,
  },
  inline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  success: {
    fontSize: 13,
  },
});
