import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { jobApplicationCreateSchema } from '@navaja/shared';
import {
  ActionButton,
  Card,
  ErrorText,
  Field,
  HeroPanel,
  Label,
  MultilineField,
  Screen,
  SurfaceCard,
} from '../../components/ui/primitives';
import {
  hasExternalApi,
  submitDirectJobApplicationViaApi,
  submitNetworkJobApplicationViaApi,
} from '../../lib/api';
import {
  formatMarketplaceLocation,
  listMarketplaceShops,
  resolvePreferredMarketplaceShopId,
  saveMarketplaceShopId,
  type MarketplaceShop,
} from '../../lib/marketplace';
import { useNavajaTheme } from '../../lib/theme';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const NETWORK_SCOPE = 'network';

export default function EmpleoScreen() {
  const { colors } = useNavajaTheme();
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [target, setTarget] = useState<string>(NETWORK_SCOPE);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [experienceYears, setExperienceYears] = useState('1');
  const [availability, setAvailability] = useState('');
  const [cvAsset, setCvAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        const marketplaceShops = await listMarketplaceShops();
        if (!active) {
          return;
        }

        setShops(marketplaceShops);
        const preferredShopId = await resolvePreferredMarketplaceShopId(marketplaceShops);
        if (!active) {
          return;
        }

        if (hasExternalApi) {
          setTarget((current) =>
            current === NETWORK_SCOPE ? current : preferredShopId || NETWORK_SCOPE,
          );
        } else {
          setTarget(preferredShopId || '');
        }
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  const targetLabel = useMemo(() => {
    if (target === NETWORK_SCOPE) {
      return 'Bolsa general del marketplace';
    }

    const selectedShop = shops.find((shop) => shop.id === target);
    if (!selectedShop) {
      return 'Barberia seleccionada';
    }

    return `${selectedShop.name} - ${formatMarketplaceLocation(selectedShop)}`;
  }, [shops, target]);

  async function pickCv() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset) {
      return;
    }

    setCvAsset(asset);
  }

  async function updateTarget(nextTarget: string) {
    setTarget(nextTarget);
    if (nextTarget && nextTarget !== NETWORK_SCOPE) {
      await saveMarketplaceShopId(nextTarget);
    }
  }

  async function submitApplication() {
    setError(null);
    setMessage(null);

    if (!cvAsset) {
      setError('Adjunta tu CV para continuar.');
      return;
    }

    if (cvAsset.size && cvAsset.size > MAX_FILE_SIZE) {
      setError('El archivo supera 5MB.');
      return;
    }

    if (target === NETWORK_SCOPE) {
      if (!hasExternalApi) {
        setError(
          'La bolsa general requiere EXPO_PUBLIC_API_BASE_URL para usar las rutas web desde la app.',
        );
        return;
      }

      setSubmitting(true);
      let sent = false;

      try {
        await submitNetworkJobApplicationViaApi(
          {
            name,
            phone,
            email,
            instagram: instagram || null,
            experience_years: Number(experienceYears),
            availability,
          },
          cvAsset,
        );

        setMessage('Tu CV ya esta en la bolsa general del marketplace.');
        sent = true;
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'No se pudo enviar la postulacion.',
        );
      } finally {
        setSubmitting(false);
      }

      if (sent) {
        resetForm();
      }
      return;
    }

    const parsed = jobApplicationCreateSchema.safeParse({
      shop_id: target,
      name,
      phone,
      email,
      instagram: instagram || null,
      experience_years: Number(experienceYears),
      availability,
    });

    if (!parsed.success) {
      setError('Revisa los datos del formulario.');
      return;
    }

    setSubmitting(true);

    try {
      const apiResult = await submitDirectJobApplicationViaApi(parsed.data, cvAsset);
      if (!apiResult) {
        setError(
          'Configura EXPO_PUBLIC_API_BASE_URL para enviar postulaciones desde mobile con la misma logica de la web.',
        );
        return;
      }

      setMessage('Postulacion enviada. Te vamos a contactar.');
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'No se pudo enviar la postulacion.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setName('');
    setPhone('');
    setEmail('');
    setInstagram('');
    setExperienceYears('1');
    setAvailability('');
    setCvAsset(null);
  }

  return (
    <Screen
      eyebrow="Empleo"
      title="Postulate a una barberia o deja tu CV en la red"
      subtitle="Postulate directamente a una barberia o deja tu CV en la bolsa general de la red."
    >
      <HeroPanel
        eyebrow="Empleo marketplace"
        title={targetLabel}
        description={
          hasExternalApi
            ? 'Puedes enviar una vez a la bolsa general o apuntar directo a una barberia.'
            : 'Sin API externa, el flujo mobile mantiene la postulacion directa a barberia.'
        }
      />

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Enviar mi CV a</Text>
        <View style={styles.targetList}>
          {hasExternalApi ? (
            <SurfaceCard
              active={target === NETWORK_SCOPE}
              onPress={() => {
                void updateTarget(NETWORK_SCOPE);
              }}
              style={styles.targetCard}
            >
              <Text style={[styles.targetTitle, { color: colors.text }]}>
                Bolsa general del marketplace
              </Text>
              <Text style={[styles.targetSubtitle, { color: colors.textMuted }]}>
                Una sola postulacion para toda la red.
              </Text>
            </SurfaceCard>
          ) : null}

          {shops.map((shop) => (
            <SurfaceCard
              key={shop.id}
              active={target === shop.id}
              onPress={() => {
                void updateTarget(shop.id);
              }}
              style={styles.targetCard}
            >
              <Text style={[styles.targetTitle, { color: colors.text }]}>{shop.name}</Text>
              <Text style={[styles.targetSubtitle, { color: colors.textMuted }]}>
                {formatMarketplaceLocation(shop)}
              </Text>
            </SurfaceCard>
          ))}
        </View>
      </Card>

      <Card elevated>
        <Label>Nombre y apellido</Label>
        <Field value={name} onChangeText={setName} />
        <Label>Telefono</Label>
        <Field value={phone} onChangeText={setPhone} />
        <Label>Email</Label>
        <Field
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Label>Instagram (opcional)</Label>
        <Field value={instagram} onChangeText={setInstagram} />
        <Label>Experiencia (anios)</Label>
        <Field value={experienceYears} onChangeText={setExperienceYears} keyboardType="numeric" />
        <Label>Disponibilidad</Label>
        <MultilineField value={availability} onChangeText={setAvailability} />

        <SurfaceCard style={styles.cvBox}>
          <Text style={[styles.cvTitle, { color: colors.text }]}>CV (PDF/DOC hasta 5MB)</Text>
          <Text style={[styles.cvName, { color: colors.textMuted }]}>
            {cvAsset?.name || 'No seleccionaste archivo'}
          </Text>
          <ActionButton label="Elegir CV" variant="secondary" onPress={pickCv} />
        </SurfaceCard>

        <ErrorText message={error} />
        {message ? <Text style={[styles.success, { color: colors.success }]}>{message}</Text> : null}
        <ActionButton
          label={submitting ? 'Enviando...' : 'Enviar postulacion'}
          onPress={submitApplication}
          disabled={!name || !phone || !email || !availability || !target || submitting}
          loading={submitting}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 19,
    fontFamily: 'Sora_700Bold',
  },
  targetList: {
    gap: 8,
  },
  targetCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  targetTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  targetSubtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  cvBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  cvTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  cvName: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  success: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
