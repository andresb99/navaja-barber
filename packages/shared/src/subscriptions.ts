import type { SubscriptionPlan, SubscriptionStatus } from './schemas';

export type SubscriptionTier = SubscriptionPlan;
export type SubscriptionBillingMode = 'monthly' | 'annual_installments';

export interface SubscriptionPlanDescriptor {
  id: SubscriptionTier;
  tier: SubscriptionTier;
  name: string;
  badge?: string;
  description: string;
  monthlyPriceCents: number;
  annualInstallmentCents: number;
  features: string[];
  canBypassPayments: boolean;
}

export const SUBSCRIPTION_PLAN_CATALOG: Record<SubscriptionTier, SubscriptionPlanDescriptor> = {
  free: {
    id: 'free',
    tier: 'free',
    name: 'Free',
    description: 'Plan base para empezar con presencia y agenda simple.',
    monthlyPriceCents: 0,
    annualInstallmentCents: 0,
    features: ['Agenda online basica', 'Perfil publico de barberia', 'Hasta 2 miembros del equipo'],
    canBypassPayments: true,
  },
  pro: {
    id: 'pro',
    tier: 'pro',
    name: 'Pro',
    badge: 'Mas elegido',
    description: 'Ideal para barberias que venden reservas, cursos y convocatorias.',
    monthlyPriceCents: 149000,
    annualInstallmentCents: 124000,
    features: [
      'Todo Free + recordatorios',
      'Cursos + convocatorias de modelos',
      'Metricas operativas del negocio',
    ],
    canBypassPayments: false,
  },
  business: {
    id: 'business',
    tier: 'business',
    name: 'Business',
    description: 'Para operaciones con multiples sedes y control avanzado.',
    monthlyPriceCents: 369000,
    annualInstallmentCents: 309000,
    features: [
      'Todo Pro + multi-sede',
      'Roles avanzados y permisos granulares',
      'Soporte prioritario y onboarding',
    ],
    canBypassPayments: false,
  },
  app_admin: {
    id: 'app_admin',
    tier: 'app_admin',
    name: 'App Admin',
    description: 'Cuenta interna para testing y soporte de plataforma.',
    monthlyPriceCents: 0,
    annualInstallmentCents: 0,
    features: [
      'Acceso total de plataforma',
      'Switch de planes para pruebas',
      'Sin bloqueo de pagos para QA',
    ],
    canBypassPayments: true,
  },
};

export const PUBLIC_MARKETPLACE_PLANS: SubscriptionTier[] = ['free', 'pro', 'business'];

export function getSubscriptionPlanDescriptor(tier: SubscriptionTier) {
  return SUBSCRIPTION_PLAN_CATALOG[tier];
}

export function getSubscriptionPriceCents(
  tier: SubscriptionTier,
  billingMode: SubscriptionBillingMode,
) {
  const descriptor = getSubscriptionPlanDescriptor(tier);
  return billingMode === 'monthly' ? descriptor.monthlyPriceCents : descriptor.annualInstallmentCents;
}

export function getMaxAnnualSavingsPercent() {
  return Math.max(
    0,
    ...PUBLIC_MARKETPLACE_PLANS.map((tier) => {
      const descriptor = getSubscriptionPlanDescriptor(tier);
      if (descriptor.monthlyPriceCents <= 0 || descriptor.annualInstallmentCents <= 0) {
        return 0;
      }

      const monthlyYearTotal = descriptor.monthlyPriceCents * 12;
      const annualYearTotal = descriptor.annualInstallmentCents * 12;
      return Math.round(((monthlyYearTotal - annualYearTotal) / monthlyYearTotal) * 100);
    }),
  );
}

export function requiresReservationPayment(tier: SubscriptionTier) {
  return !getSubscriptionPlanDescriptor(tier).canBypassPayments;
}

export function isSubscriptionOperational(status: SubscriptionStatus) {
  return status === 'active' || status === 'trialing';
}

export function normalizeSubscriptionTier(value: string | null | undefined): SubscriptionTier {
  const normalized = String(value || '').trim();
  if (
    normalized === 'free' ||
    normalized === 'pro' ||
    normalized === 'business' ||
    normalized === 'app_admin'
  ) {
    return normalized;
  }

  return 'free';
}

export function normalizeSubscriptionStatus(value: string | null | undefined): SubscriptionStatus {
  const normalized = String(value || '').trim();
  if (
    normalized === 'active' ||
    normalized === 'trialing' ||
    normalized === 'past_due' ||
    normalized === 'cancelled'
  ) {
    return normalized;
  }

  return 'active';
}
