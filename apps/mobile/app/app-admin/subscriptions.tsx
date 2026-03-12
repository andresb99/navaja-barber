import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  SUBSCRIPTION_PLAN_CATALOG,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@navaja/shared';
import { useFocusEffect } from 'expo-router';
import {
  ActionButton,
  Card,
  Chip,
  ErrorText,
  MutedText,
  Screen,
  SelectionChip,
} from '../../components/ui/primitives';
import {
  hasExternalApi,
  listAppAdminSubscriptionsViaApi,
  updateAppAdminSubscriptionViaApi,
  type AppAdminSubscriptionItemApi,
} from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

const PLAN_OPTIONS: SubscriptionTier[] = ['free', 'pro', 'business', 'app_admin'];
const STATUS_OPTIONS: SubscriptionStatus[] = ['active', 'trialing', 'past_due', 'cancelled'];

interface DraftValue {
  plan: SubscriptionTier;
  status: SubscriptionStatus;
}

function createDraftMap(items: AppAdminSubscriptionItemApi[]) {
  return items.reduce<Record<string, DraftValue>>((acc, item) => {
    acc[item.shopId] = {
      plan: item.plan,
      status: item.status,
    };
    return acc;
  }, {});
}

export default function AppAdminSubscriptionsScreen() {
  const { colors } = useNavajaTheme();
  const [items, setItems] = useState<AppAdminSubscriptionItemApi[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftValue>>({});
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingShopId, setSavingShopId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!hasExternalApi) {
      setAllowed(false);
      setLoading(false);
      setError('Configura EXPO_PUBLIC_API_BASE_URL para usar app admin desde mobile.');
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';

    if (!accessToken) {
      setAllowed(false);
      setLoading(false);
      setError('Debes iniciar sesion para usar app admin.');
      return;
    }

    try {
      const response = await listAppAdminSubscriptionsViaApi({ accessToken });
      const nextItems = response?.items || [];
      setAllowed(true);
      setItems(nextItems);
      setDrafts(createDraftMap(nextItems));
    } catch (cause) {
      const nextMessage =
        cause instanceof Error
          ? cause.message
          : 'No se pudieron cargar las suscripciones de testing.';
      setAllowed(!nextMessage.toLowerCase().includes('acceso denegado'));
      setError(nextMessage);
      setItems([]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const hasChangesByShopId = useMemo(() => {
    return items.reduce<Record<string, boolean>>((acc, item) => {
      const draft = drafts[item.shopId];
      acc[item.shopId] = Boolean(
        draft && (draft.plan !== item.plan || draft.status !== item.status),
      );
      return acc;
    }, {});
  }, [drafts, items]);

  function updateDraft(shopId: string, patch: Partial<DraftValue>) {
    setDrafts((current) => ({
      ...current,
      [shopId]: {
        plan: current[shopId]?.plan || 'free',
        status: current[shopId]?.status || 'active',
        ...patch,
      },
    }));
  }

  async function saveItem(item: AppAdminSubscriptionItemApi) {
    const draft = drafts[item.shopId];
    if (!draft) {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';
    if (!accessToken) {
      setError('Debes iniciar sesion para actualizar la suscripcion.');
      return;
    }

    setSavingShopId(item.shopId);
    setError(null);
    setMessage(null);

    try {
      await updateAppAdminSubscriptionViaApi({
        accessToken,
        shopId: item.shopId,
        plan: draft.plan,
        status: draft.status,
      });
      setMessage(`Suscripcion actualizada para ${item.shopName}.`);
      await loadData();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo actualizar la suscripcion.',
      );
    } finally {
      setSavingShopId(null);
    }
  }

  if (!allowed && !loading) {
    return (
      <Screen title="App admin" subtitle="Acceso restringido">
        <Card>
          <Text style={[styles.title, { color: colors.text }]}>
            Tu usuario no tiene permisos de platform admin.
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Esta vista interna solo esta disponible para testing y soporte de plataforma.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="App admin"
      subtitle="Switch de suscripciones para testing operativo"
    >
      <ErrorText message={error} />
      {message ? <Text style={[styles.success, { color: colors.success }]}>{message}</Text> : null}
      {loading ? <MutedText>Cargando barberias...</MutedText> : null}

      {!loading && !items.length ? (
        <Card>
          <MutedText>No hay barberias disponibles para testing.</MutedText>
        </Card>
      ) : null}

      {items.map((item) => {
        const draft = drafts[item.shopId] || {
          plan: item.plan,
          status: item.status,
        };
        const descriptor = SUBSCRIPTION_PLAN_CATALOG[draft.plan];
        const hasChanges = hasChangesByShopId[item.shopId];

        return (
          <Card key={item.shopId} elevated>
            <View style={styles.cardHeader}>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: colors.text }]}>{item.shopName}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {item.shopSlug} - estado tienda: {item.shopStatus}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  Renovacion:{' '}
                  {item.currentPeriodEnd ? formatDateTime(item.currentPeriodEnd) : 'N/A'}
                </Text>
              </View>
              <Chip
                label={`${item.plan} / ${item.status}`}
                tone={item.status === 'past_due' ? 'warning' : item.status === 'cancelled' ? 'danger' : 'success'}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Plan</Text>
              <View style={styles.chips}>
                {PLAN_OPTIONS.map((option) => (
                  <SelectionChip
                    key={`${item.shopId}:plan:${option}`}
                    label={SUBSCRIPTION_PLAN_CATALOG[option].name}
                    active={draft.plan === option}
                    onPress={() => updateDraft(item.shopId, { plan: option })}
                    disabled={savingShopId === item.shopId}
                  />
                ))}
              </View>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {descriptor.description}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Mensual: {formatCurrency(descriptor.monthlyPriceCents)} · 12 cuotas:{' '}
                {formatCurrency(descriptor.annualInstallmentCents)}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Estado</Text>
              <View style={styles.chips}>
                {STATUS_OPTIONS.map((option) => (
                  <SelectionChip
                    key={`${item.shopId}:status:${option}`}
                    label={option}
                    active={draft.status === option}
                    onPress={() => updateDraft(item.shopId, { status: option })}
                    disabled={savingShopId === item.shopId}
                  />
                ))}
              </View>
            </View>

            <ActionButton
              label={savingShopId === item.shopId ? 'Aplicando...' : 'Aplicar'}
              onPress={() => {
                void saveItem(item);
              }}
              loading={savingShopId === item.shopId}
              disabled={savingShopId === item.shopId || !hasChanges}
            />
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  success: {
    fontSize: 13,
    fontWeight: '600',
  },
});
