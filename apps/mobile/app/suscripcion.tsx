import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  getSubscriptionPlanDescriptor,
  getSubscriptionBillingMessageFromUrl,
  normalizeSubscriptionStatus,
  normalizeSubscriptionTier,
  PUBLIC_MARKETPLACE_PLANS,
  publicMarketingSubscriptionHero,
  resolveSubscriptionBillingMessage,
  type SubscriptionBillingMode,
  type SubscriptionBillingMessage,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@navaja/shared';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import {
  ActionButton,
  Card,
  Chip,
  ErrorText,
  HeroPanel,
  PillToggle,
  Screen,
  StatTile,
  SurfaceCard,
} from '../components/ui/primitives';
import { PlatformQuickLinks } from '../components/marketing/platform-quick-links';
import { getAccessToken, getAuthContext, type AppRole } from '../lib/auth';
import { createSubscriptionCheckoutViaApi, hasExternalApi } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useNavajaTheme } from '../lib/theme';

type BillingMessage = SubscriptionBillingMessage | null;

WebBrowser.maybeCompleteAuthSession();

const paidPlanOptions: Array<Extract<SubscriptionTier, 'pro' | 'business'>> = ['pro', 'business'];

function formatUyuCents(amountCents: number) {
  return formatCurrency(Math.round(amountCents), 'UYU', 'es-UY').replace(/,00$/, '');
}

function getStatusLabel(status: SubscriptionStatus) {
  if (status === 'trialing') {
    return 'En prueba';
  }

  if (status === 'past_due') {
    return 'Pago pendiente';
  }

  if (status === 'cancelled') {
    return 'Cancelado';
  }

  return 'Activo';
}

function getStatusTone(status: SubscriptionStatus): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'past_due') {
    return 'warning';
  }

  if (status === 'cancelled') {
    return 'danger';
  }

  return 'success';
}

export default function SuscripcionScreen() {
  const { colors } = useNavajaTheme();
  const params = useLocalSearchParams<{ billing?: string | string[] }>();
  const routeBillingMessage = resolveSubscriptionBillingMessage(params.billing);
  const [role, setRole] = useState<AppRole>('guest');
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [canManageSelectedWorkspace, setCanManageSelectedWorkspace] = useState(false);
  const [canAdminAnyWorkspace, setCanAdminAnyWorkspace] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionTier>('free');
  const [currentStatus, setCurrentStatus] = useState<SubscriptionStatus>('active');
  const [billingMode, setBillingMode] = useState<SubscriptionBillingMode>('monthly');
  const [loading, setLoading] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState<SubscriptionTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBillingMessage, setCheckoutBillingMessage] = useState<BillingMessage>(null);
  const billingMessage = routeBillingMessage || checkoutBillingMessage;

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const auth = await getAuthContext();
      const canManageWorkspace = auth.role === 'admin' && Boolean(auth.shopId);

      setRole(auth.role);
      setShopId(auth.shopId);
      setShopName(auth.shopName);
      setCanManageSelectedWorkspace(canManageWorkspace);
      setCanAdminAnyWorkspace(auth.workspaces.some((workspace) => workspace.role === 'admin'));

      if (!canManageWorkspace || !auth.shopId) {
        setCurrentPlan('free');
        setCurrentStatus('active');
        setLoading(false);
        return;
      }

      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('shop_id', auth.shopId)
        .maybeSingle();

      if (subscriptionError) {
        throw subscriptionError;
      }

      setCurrentPlan(normalizeSubscriptionTier(subscription?.plan));
      setCurrentStatus(normalizeSubscriptionStatus(subscription?.status));
      setLoading(false);
    } catch (cause) {
      setLoading(false);
      setError(
        cause instanceof Error ? cause.message : 'No se pudo cargar la suscripcion actual.',
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadState();
    }, [loadState]),
  );

  const planStats = useMemo(
    () =>
      PUBLIC_MARKETPLACE_PLANS.map((planId) => {
        const plan = getSubscriptionPlanDescriptor(planId);
        return {
          label: plan.name,
          value: formatUyuCents(plan.monthlyPriceCents),
        };
      }),
    [],
  );

  async function startCheckout(targetPlan: Extract<SubscriptionTier, 'pro' | 'business'>) {
    if (!shopId) {
      setError('Selecciona una barberia administrable para continuar.');
      return;
    }

    if (!hasExternalApi) {
      setError(
        'Configura EXPO_PUBLIC_API_BASE_URL para iniciar el checkout de suscripcion desde mobile.',
      );
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError('Debes iniciar sesion para gestionar la suscripcion.');
      return;
    }

    setSubmittingPlan(targetPlan);
    setError(null);
    setCheckoutBillingMessage(null);

    try {
      const returnTo = Linking.createURL('/suscripcion');
      const response = await createSubscriptionCheckoutViaApi({
        accessToken,
        shopId,
        targetPlan,
        billingMode,
        returnTo,
      });

      if (!response?.checkout_url) {
        throw new Error('No se pudo iniciar el checkout de Mercado Pago.');
      }

      const result = await WebBrowser.openAuthSessionAsync(response.checkout_url, returnTo);
      if (result.type === 'success' && 'url' in result && result.url) {
        setCheckoutBillingMessage(getSubscriptionBillingMessageFromUrl(result.url));
      } else if (result.type !== 'cancel' && result.type !== 'dismiss') {
        throw new Error('No se pudo completar el retorno del checkout.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar el checkout.');
    } finally {
      setSubmittingPlan(null);
      void loadState();
    }
  }

  return (
    <Screen
      eyebrow="Suscripcion"
      title="Planes y precios"
      subtitle="La app ya expone el mismo catalogo y la misma gestion principal de suscripcion que web, adaptada al flujo nativo."
    >
      <HeroPanel
        eyebrow={publicMarketingSubscriptionHero.eyebrow}
        title={publicMarketingSubscriptionHero.title}
        description={publicMarketingSubscriptionHero.description}
      >
        <View style={styles.statsRow}>
          {planStats.map((item) => (
            <StatTile key={item.label} label={item.label} value={item.value} />
          ))}
        </View>
      </HeroPanel>

      {billingMessage === 'success' ? (
        <Card>
          <Text style={[styles.bannerText, { color: colors.success }]}>
            Pago recibido. En breve se actualiza tu suscripcion.
          </Text>
        </Card>
      ) : null}

      {billingMessage === 'pending' ? (
        <Card>
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            El pago quedo pendiente. Verifica el estado en Mercado Pago.
          </Text>
        </Card>
      ) : null}

      {billingMessage === 'failure' ? (
        <Card>
          <Text style={[styles.bannerText, { color: colors.danger }]}>
            No se pudo completar el pago de la suscripcion.
          </Text>
        </Card>
      ) : null}

      <ErrorText message={error} />

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Catalogo de planes</Text>
        <View style={styles.list}>
          {PUBLIC_MARKETPLACE_PLANS.map((planId) => {
            const plan = getSubscriptionPlanDescriptor(planId);
            const isRecommended = Boolean(plan.badge);
            return (
              <SurfaceCard
                key={plan.id}
                style={[
                  styles.planCard,
                  isRecommended
                    ? {
                        borderColor: colors.mode === 'dark' ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.6)',
                        borderWidth: 2,
                      }
                    : null,
                ]}
              >
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                  {plan.badge ? <Chip label={plan.badge} tone="success" /> : null}
                </View>
                <Text style={[styles.planDescription, { color: colors.textMuted }]}>
                  {plan.description}
                </Text>
                <View style={[styles.priceBlock, { borderColor: colors.border, backgroundColor: colors.panelMuted }]}>
                  <Text style={[styles.planPrice, { color: colors.text }]}>
                    {plan.monthlyPriceCents > 0 ? formatUyuCents(plan.monthlyPriceCents) : 'Gratis'}
                  </Text>
                  <Text style={[styles.planMeta, { color: colors.textMuted }]}>
                    {plan.monthlyPriceCents > 0 ? 'por mes' : 'para siempre'}
                  </Text>
                  {plan.annualInstallmentCents > 0 ? (
                    <Text style={[styles.planMeta, { color: colors.textMuted }]}>
                      Anual: 12x {formatUyuCents(plan.annualInstallmentCents)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.featureList}>
                  {plan.features.map((feature) => (
                    <View key={`${plan.id}-${feature}`} style={styles.featureItem}>
                      <Feather name="check" size={13} color={colors.mode === 'dark' ? '#a78bfa' : '#7c3aed'} style={styles.featureIcon} />
                      <Text style={[styles.featureText, { color: colors.textMuted }]}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </SurfaceCard>
            );
          })}
        </View>
      </Card>

      {role === 'guest' ? (
        <Card elevated>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Inicia sesion para suscribirte</Text>
          <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
            Crea tu cuenta o ingresa para activar Pro o Business desde tu espacio de cuenta.
          </Text>
          <ActionButton label="Ingresar o registrarme" onPress={() => router.push('/(auth)/login')} />
        </Card>
      ) : null}

      {role !== 'guest' && canManageSelectedWorkspace ? (
        <Card elevated>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Suscripcion actual</Text>
          <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
            {shopName || 'La barberia seleccionada'}
          </Text>

          <View style={styles.currentPlanRow}>
            <Text style={[styles.currentPlanName, { color: colors.text }]}>
              {getSubscriptionPlanDescriptor(currentPlan).name}
            </Text>
            <Chip label={getStatusLabel(currentStatus)} tone={getStatusTone(currentStatus)} />
          </View>

          <View style={styles.billingToggleRow}>
            <PillToggle
              label="Mensual"
              active={billingMode === 'monthly'}
              onPress={() => setBillingMode('monthly')}
            />
            <PillToggle
              label="Anual en cuotas"
              active={billingMode === 'annual_installments'}
              onPress={() => setBillingMode('annual_installments')}
            />
          </View>

          <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
            El checkout se abre en Mercado Pago dentro del navegador del dispositivo.
          </Text>

          {loading ? (
            <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>Cargando suscripcion...</Text>
          ) : null}

          <View style={styles.list}>
            {paidPlanOptions.map((planId) => {
              const descriptor = getSubscriptionPlanDescriptor(planId);
              const isCurrent = currentPlan === planId && currentStatus === 'active';
              const price =
                billingMode === 'monthly'
                  ? `${formatUyuCents(descriptor.monthlyPriceCents)} / mes`
                  : `12x ${formatUyuCents(descriptor.annualInstallmentCents)} / mes`;

              return (
                <SurfaceCard key={planId} style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <Text style={[styles.planName, { color: colors.text }]}>{descriptor.name}</Text>
                    {descriptor.badge ? <Chip label={descriptor.badge} tone="success" /> : null}
                  </View>
                  <Text style={[styles.planDescription, { color: colors.textMuted }]}>
                    {descriptor.description}
                  </Text>
                  <Text style={[styles.planPrice, { color: colors.text }]}>{price}</Text>
                  <ActionButton
                    label={
                      submittingPlan === planId
                        ? 'Abriendo checkout...'
                        : isCurrent
                          ? 'Plan activo'
                          : `Pagar ${descriptor.name}`
                    }
                    onPress={() => {
                      void startCheckout(planId);
                    }}
                    disabled={isCurrent || submittingPlan !== null || loading}
                    loading={submittingPlan === planId}
                  />
                </SurfaceCard>
              );
            })}
          </View>
        </Card>
      ) : null}

      {role !== 'guest' && !canManageSelectedWorkspace ? (
        <Card elevated>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tu cuenta necesita una barberia administrable
          </Text>
          <Text style={[styles.sectionCopy, { color: colors.textMuted }]}>
            {canAdminAnyWorkspace
              ? 'Selecciona una barberia donde seas admin y luego activa el plan desde esta cuenta.'
              : 'Primero crea una barberia para poder activar un plan desde tu cuenta.'}
          </Text>
          <ActionButton
            label={canAdminAnyWorkspace ? 'Elegir barberia' : 'Crear barberia'}
            variant="secondary"
            onPress={() => router.push(canAdminAnyWorkspace ? '/mis-barberias' : '/onboarding/barbershop')}
          />
        </Card>
      ) : null}

      <PlatformQuickLinks excludeHrefs={['/suscripcion']} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: 8,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  planName: {
    fontSize: 15,
    fontWeight: '800',
  },
  planDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  priceBlock: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 2,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  planMeta: {
    fontSize: 12,
  },
  featureList: {
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  currentPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  currentPlanName: {
    fontSize: 16,
    fontWeight: '800',
  },
  billingToggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
