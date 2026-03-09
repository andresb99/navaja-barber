import type { SubscriptionStatus, SubscriptionTier } from '@/lib/subscription-plans';
import { normalizeShopSlug } from '@/lib/shop-links';

export type ShopDomainStatus = 'pending' | 'verified' | 'active' | 'failed';
export type TenantHostResolutionMode = 'custom_domain' | 'platform_subdomain';

export interface PlatformHostConfig {
  appHost: string | null;
  rootDomain: string | null;
  previewHostSuffixes?: string[];
  reservedSubdomains?: string[];
}

export interface ResolvedTenantLookupRecord {
  shopId: string;
  shopSlug: string;
  shopStatus: string;
  customDomain?: string | null;
  plan: SubscriptionTier | string | null;
  subscriptionStatus: SubscriptionStatus | string | null;
  domainStatus: ShopDomainStatus | string | null;
}

export interface ResolvedTenantHostMatch {
  mode: TenantHostResolutionMode;
  hostname: string;
  shopId: string;
  shopSlug: string;
}

export interface TenantHostLookup {
  findByCustomDomain(domain: string): Promise<ResolvedTenantLookupRecord | null>;
  findBySlug(slug: string): Promise<ResolvedTenantLookupRecord | null>;
}

export interface CustomDomainValidationResult {
  ok: boolean;
  message: string | null;
  normalizedDomain: string | null;
}

const LOCAL_DEVELOPMENT_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const DEFAULT_PREVIEW_HOST_SUFFIXES = ['vercel.app'];
const DEFAULT_RESERVED_SUBDOMAINS = ['www', 'app', 'admin', 'api'];

function stripProtocolAndPath(value: string) {
  let next = String(value || '').trim().toLowerCase();
  if (!next) {
    return '';
  }

  next = next.replace(/^https?:\/\//, '');
  next = next.replace(/[/?#].*$/, '');
  next = next.replace(/\.+$/, '');

  const atIndex = next.lastIndexOf('@');
  if (atIndex >= 0) {
    next = next.slice(atIndex + 1);
  }

  return next;
}

function stripPort(value: string) {
  if (!value) {
    return '';
  }

  if (!value.includes(':')) {
    return value;
  }

  const [hostname] = value.split(':');
  return hostname || '';
}

function isIpv4Hostname(hostname: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function isValidDomainLabel(label: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
}

function isValidDomainHostname(hostname: string) {
  if (!hostname || hostname.length > 253) {
    return false;
  }

  const labels = hostname.split('.').filter(Boolean);
  if (labels.length < 2) {
    return false;
  }

  return labels.every(isValidDomainLabel);
}

function normalizeHostnameCore(
  value: string,
  options?: {
    stripWww?: boolean;
    allowLocalhost?: boolean;
  },
) {
  const stripped = stripPort(stripProtocolAndPath(value));
  if (!stripped) {
    return null;
  }

  const normalized = stripped === '0.0.0.0' ? 'localhost' : stripped;
  const maybeWithoutWww =
    options?.stripWww !== false ? normalized.replace(/^www\./, '') : normalized;

  if (options?.allowLocalhost && LOCAL_DEVELOPMENT_HOSTS.has(maybeWithoutWww)) {
    return maybeWithoutWww === '0.0.0.0' ? 'localhost' : maybeWithoutWww;
  }

  if (LOCAL_DEVELOPMENT_HOSTS.has(maybeWithoutWww) || isIpv4Hostname(maybeWithoutWww)) {
    return null;
  }

  return isValidDomainHostname(maybeWithoutWww) ? maybeWithoutWww : null;
}

function getPreviewHostSuffixes(config?: PlatformHostConfig) {
  return config?.previewHostSuffixes?.length
    ? config.previewHostSuffixes
    : DEFAULT_PREVIEW_HOST_SUFFIXES;
}

function getReservedSubdomains(config?: PlatformHostConfig) {
  return config?.reservedSubdomains?.length
    ? config.reservedSubdomains
    : DEFAULT_RESERVED_SUBDOMAINS;
}

export function normalizeCustomDomain(value: string) {
  return normalizeHostnameCore(value, {
    stripWww: true,
    allowLocalhost: false,
  });
}

export function normalizeRequestHost(value: string) {
  return normalizeHostnameCore(value, {
    stripWww: true,
    allowLocalhost: true,
  });
}

export function normalizeHostPattern(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return normalizeHostnameCore(value, {
    stripWww: false,
    allowLocalhost: true,
  });
}

export function isLocalDevelopmentHost(hostname: string | null | undefined) {
  const normalized = normalizeRequestHost(String(hostname || ''));
  return normalized ? LOCAL_DEVELOPMENT_HOSTS.has(normalized) : false;
}

export function isVercelPreviewHost(hostname: string | null | undefined, config?: PlatformHostConfig) {
  const normalized = normalizeRequestHost(String(hostname || ''));
  if (!normalized) {
    return false;
  }

  return getPreviewHostSuffixes(config).some((suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`));
}

export function canUseCustomDomainForPlan(plan: SubscriptionTier | string | null | undefined) {
  return String(plan || '').trim().toLowerCase() === 'business';
}

export function isOperationalSubscriptionStatus(status: SubscriptionStatus | string | null | undefined) {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'active' || normalized === 'trialing';
}

export function canRouteTenantOnCustomDomain(record: ResolvedTenantLookupRecord | null | undefined) {
  if (!record) {
    return false;
  }

  const domainStatus = String(record.domainStatus || '').trim().toLowerCase();
  return (
    String(record.shopStatus || '').trim().toLowerCase() === 'active' &&
    canUseCustomDomainForPlan(record.plan) &&
    isOperationalSubscriptionStatus(record.subscriptionStatus) &&
    (domainStatus === 'verified' || domainStatus === 'active')
  );
}

export function canRouteTenantOnPlatformHost(record: ResolvedTenantLookupRecord | null | undefined) {
  if (!record) {
    return false;
  }

  return String(record.shopStatus || '').trim().toLowerCase() === 'active';
}

export function getReservedCustomDomainReason(
  hostname: string | null | undefined,
  config: PlatformHostConfig,
) {
  const normalized = normalizeRequestHost(String(hostname || ''));
  if (!normalized) {
    return 'Ingresa un dominio valido.';
  }

  if (LOCAL_DEVELOPMENT_HOSTS.has(normalized)) {
    return 'No puedes usar hosts locales como dominio personalizado.';
  }

  if (isVercelPreviewHost(normalized, config)) {
    return 'Los dominios de preview de Vercel estan reservados para la plataforma.';
  }

  const appHost = normalizeHostPattern(config.appHost);
  if (appHost && normalized === appHost.replace(/^www\./, '')) {
    return 'Ese dominio ya esta reservado como host principal de la plataforma.';
  }

  const rootDomain = normalizeHostPattern(config.rootDomain);
  if (rootDomain) {
    if (normalized === rootDomain.replace(/^www\./, '')) {
      return 'Ese dominio raiz ya esta reservado para la plataforma.';
    }

    if (normalized.endsWith(`.${rootDomain}`)) {
      return 'Los subdominios internos de la plataforma no pueden asignarse como dominios personalizados.';
    }
  }

  return null;
}

export function validateCustomDomainAssignment(options: {
  requestedDomain: string;
  currentShopId: string;
  currentPlan: SubscriptionTier | string | null | undefined;
  existingDomainOwnerShopId?: string | null | undefined;
  config: PlatformHostConfig;
}): CustomDomainValidationResult {
  if (!canUseCustomDomainForPlan(options.currentPlan)) {
    return {
      ok: false,
      message: 'Los dominios personalizados estan disponibles solo para el plan Business.',
      normalizedDomain: null,
    };
  }

  const normalizedDomain = normalizeCustomDomain(options.requestedDomain);
  if (!normalizedDomain) {
    return {
      ok: false,
      message: 'Ingresa un dominio valido, sin protocolo ni rutas.',
      normalizedDomain: null,
    };
  }

  const reservedReason = getReservedCustomDomainReason(normalizedDomain, options.config);
  if (reservedReason) {
    return {
      ok: false,
      message: reservedReason,
      normalizedDomain: null,
    };
  }

  if (
    options.existingDomainOwnerShopId &&
    options.existingDomainOwnerShopId !== options.currentShopId
  ) {
    return {
      ok: false,
      message: 'Ese dominio ya esta conectado a otra barberia.',
      normalizedDomain: null,
    };
  }

  return {
    ok: true,
    message: null,
    normalizedDomain,
  };
}

export function validateCustomDomainActivation(options: {
  currentPlan: SubscriptionTier | string | null | undefined;
  currentDomain: string | null | undefined;
}) {
  if (!canUseCustomDomainForPlan(options.currentPlan)) {
    return 'Solo los tenants Business pueden activar dominios personalizados.';
  }

  if (!normalizeCustomDomain(String(options.currentDomain || ''))) {
    return 'Primero guarda un dominio valido antes de activarlo.';
  }

  return null;
}

export function resolvePlatformSubdomain(
  hostname: string | null | undefined,
  config: PlatformHostConfig,
) {
  const normalized = normalizeRequestHost(String(hostname || ''));
  if (!normalized) {
    return null;
  }

  const rootDomain = normalizeHostPattern(config.rootDomain);
  if (!rootDomain) {
    return null;
  }

  if (normalized === rootDomain) {
    return null;
  }

  if (!normalized.endsWith(`.${rootDomain}`)) {
    return null;
  }

  const suffix = `.${rootDomain}`;
  const rawSubdomain = normalized.slice(0, -suffix.length);
  if (!rawSubdomain || rawSubdomain.includes('.')) {
    return null;
  }

  if (getReservedSubdomains(config).includes(rawSubdomain)) {
    return null;
  }

  return normalizeShopSlug(rawSubdomain);
}

export function getTenantPublicRewritePath(pathname: string, shopSlug: string) {
  const normalizedSlug = normalizeShopSlug(shopSlug);
  if (!normalizedSlug) {
    return null;
  }

  if (pathname.startsWith('/shops/')) {
    return null;
  }

  if (pathname === '/') {
    return `/shops/${normalizedSlug}`;
  }

  if (pathname === '/book') {
    return `/shops/${normalizedSlug}/book`;
  }

  if (pathname === '/jobs') {
    return `/shops/${normalizedSlug}/jobs`;
  }

  if (pathname === '/modelos') {
    return `/shops/${normalizedSlug}/modelos`;
  }

  if (pathname === '/modelos/registro') {
    return `/shops/${normalizedSlug}/modelos/registro`;
  }

  if (pathname === '/courses') {
    return `/shops/${normalizedSlug}/courses`;
  }

  if (pathname.startsWith('/courses/')) {
    const courseSuffix = pathname.slice('/courses/'.length);
    if (courseSuffix && !courseSuffix.startsWith('enrollment/')) {
      return `/shops/${normalizedSlug}/courses/${courseSuffix}`;
    }
  }

  return null;
}

export async function resolveTenantByHost(
  host: string,
  options: {
    config: PlatformHostConfig;
    lookup: TenantHostLookup;
  },
): Promise<ResolvedTenantHostMatch | null> {
  const normalizedHost = normalizeRequestHost(host);
  if (!normalizedHost) {
    return null;
  }

  const reservedReason = getReservedCustomDomainReason(normalizedHost, options.config);
  if (!reservedReason) {
    const customDomainMatch = await options.lookup.findByCustomDomain(normalizedHost);
    if (customDomainMatch && canRouteTenantOnCustomDomain(customDomainMatch)) {
      return {
        mode: 'custom_domain',
        hostname: normalizedHost,
        shopId: customDomainMatch.shopId,
        shopSlug: customDomainMatch.shopSlug,
      };
    }
  }

  const subdomain = resolvePlatformSubdomain(normalizedHost, options.config);
  if (!subdomain) {
    return null;
  }

  const subdomainMatch = await options.lookup.findBySlug(subdomain);
  if (!subdomainMatch || !canRouteTenantOnPlatformHost(subdomainMatch)) {
    return null;
  }

  return {
    mode: 'platform_subdomain',
    hostname: normalizedHost,
    shopId: subdomainMatch.shopId,
    shopSlug: subdomainMatch.shopSlug,
  };
}
