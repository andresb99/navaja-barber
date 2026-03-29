import {
  canRouteTenantOnCustomDomain,
  isVercelPreviewHost,
  normalizeCustomDomain,
} from '@/lib/custom-domains';
import { buildShopHref, normalizeShopSlug } from '@/lib/shop-links';
import { getPlatformAppUrl, getPlatformHostConfig } from '@/lib/platform-host-config';

export interface TenantPublicAddress {
  slug: string;
  status?: string | null;
  customDomain?: string | null;
  domainStatus?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
}

type TenantPublicSection = 'profile' | 'book' | 'jobs' | 'courses' | 'modelos' | 'modelos_registro';

function getNormalizedAppUrl() {
  const rawAppUrl = getPlatformAppUrl();
  if (!rawAppUrl) {
    return null;
  }

  try {
    return new URL(rawAppUrl);
  } catch {
    return null;
  }
}

function getOriginForComputation(requestOrigin: string | null | undefined) {
  const normalizedOrigin = String(requestOrigin || '').trim();
  if (normalizedOrigin) {
    try {
      return new URL(normalizedOrigin);
    } catch {
      return null;
    }
  }

  return getNormalizedAppUrl();
}

function getCanonicalTenantHost(shop: TenantPublicAddress) {
  const normalizedSlug = normalizeShopSlug(shop.slug);
  if (!normalizedSlug) {
    return null;
  }

  if (
    canRouteTenantOnCustomDomain({
      shopId: '',
      shopSlug: normalizedSlug,
      shopStatus: shop.status || 'active',
      plan: shop.plan || null,
      subscriptionStatus: shop.subscriptionStatus || null,
      domainStatus: shop.domainStatus || null,
    })
  ) {
    const customDomain = normalizeCustomDomain(String(shop.customDomain || ''));
    if (customDomain) {
      return customDomain;
    }
  }

  const platformHostConfig = getPlatformHostConfig();
  if (!platformHostConfig.rootDomain) {
    return null;
  }

  return `${normalizedSlug}.${platformHostConfig.rootDomain}`;
}

function getCanonicalSectionPath(
  section: TenantPublicSection,
  options?: {
    courseId?: string | null;
    sessionId?: string | null;
  },
) {
  if (section === 'profile') {
    return '/';
  }

  if (section === 'modelos_registro') {
    const normalizedSessionId = String(options?.sessionId || '').trim();
    return normalizedSessionId
      ? `/modelos/registro?session_id=${encodeURIComponent(normalizedSessionId)}`
      : '/modelos/registro';
  }

  if (section === 'courses') {
    const normalizedCourseId = String(options?.courseId || '').trim();
    return normalizedCourseId ? `/courses/${encodeURIComponent(normalizedCourseId)}` : '/courses';
  }

  return `/${section}`;
}

function getLegacySectionPath(
  shopSlug: string,
  section: TenantPublicSection,
  options?: {
    courseId?: string | null;
    sessionId?: string | null;
  },
) {
  if (section === 'profile') {
    return buildShopHref(shopSlug);
  }

  if (section === 'modelos_registro') {
    const basePath = `${buildShopHref(shopSlug, 'modelos')}/registro`;
    const normalizedSessionId = String(options?.sessionId || '').trim();
    return normalizedSessionId
      ? `${basePath}?session_id=${encodeURIComponent(normalizedSessionId)}`
      : basePath;
  }

  if (section === 'courses') {
    const normalizedCourseId = String(options?.courseId || '').trim();
    if (!normalizedCourseId) {
      return buildShopHref(shopSlug, 'courses');
    }

    return `${buildShopHref(shopSlug, 'courses')}/${encodeURIComponent(normalizedCourseId)}`;
  }

  return buildShopHref(shopSlug, section);
}

function shouldUseCanonicalHostUrls(requestOrigin: string | null | undefined) {
  const originUrl = getOriginForComputation(requestOrigin);
  if (!originUrl) {
    return false;
  }

  return !isVercelPreviewHost(originUrl.hostname, getPlatformHostConfig());
}

function buildOriginWithHost(hostname: string, requestOrigin: string | null | undefined) {
  const originUrl = getOriginForComputation(requestOrigin);
  if (!originUrl) {
    return null;
  }

  return `${originUrl.protocol}//${hostname}${originUrl.port ? `:${originUrl.port}` : ''}`;
}

export function buildTenantCanonicalHref(
  shop: TenantPublicAddress,
  section: TenantPublicSection,
  options?: {
    requestOrigin?: string | null;
    courseId?: string | null;
    sessionId?: string | null;
  },
) {
  const normalizedSlug = normalizeShopSlug(shop.slug);
  if (!normalizedSlug) {
    return '/shops';
  }

  const canonicalSectionPath = getCanonicalSectionPath(section, options);
  if (shouldUseCanonicalHostUrls(options?.requestOrigin)) {
    const canonicalHost = getCanonicalTenantHost(shop);
    if (canonicalHost) {
      const canonicalOrigin = buildOriginWithHost(canonicalHost, options?.requestOrigin);
      if (canonicalOrigin) {
        return `${canonicalOrigin}${canonicalSectionPath}`;
      }
    }
  }

  return getLegacySectionPath(normalizedSlug, section, options);
}

export function buildTenantCanonicalCourseHref(
  shop: TenantPublicAddress,
  courseId: string,
  options?: {
    requestOrigin?: string | null;
  },
) {
  return buildTenantCanonicalHref(shop, 'courses', {
    requestOrigin: options?.requestOrigin ?? null,
    courseId,
  });
}

export function buildTenantCanonicalModelRegistrationHref(
  shop: TenantPublicAddress,
  options?: {
    requestOrigin?: string | null;
    sessionId?: string | null;
  },
) {
  return buildTenantCanonicalHref(shop, 'modelos_registro', {
    requestOrigin: options?.requestOrigin ?? null,
    sessionId: options?.sessionId ?? null,
  });
}

export function resolveCanonicalPublicPathFromLegacyPath(pathname: string, shopSlug: string) {
  const normalizedSlug = normalizeShopSlug(shopSlug);
  if (!normalizedSlug) {
    return null;
  }

  const basePath = `/shops/${normalizedSlug}`;
  if (!pathname.startsWith(basePath)) {
    return null;
  }

  const suffix = pathname.slice(basePath.length);
  if (!suffix || suffix === '/') {
    return '/';
  }

  if (suffix === '/book') {
    return '/book';
  }

  if (suffix === '/jobs') {
    return '/jobs';
  }

  if (suffix === '/courses') {
    return '/courses';
  }

  if (suffix.startsWith('/courses/')) {
    return suffix;
  }

  if (suffix === '/modelos') {
    return '/modelos';
  }

  if (suffix === '/modelos/registro') {
    return '/modelos/registro';
  }

  if (suffix.startsWith('/modelos/registro?')) {
    return suffix;
  }

  return null;
}

export function buildCanonicalRedirectUrlFromLegacyPath(options: {
  pathname: string;
  search?: string | null;
  requestOrigin: string | null | undefined;
  shop: TenantPublicAddress;
}) {
  if (!shouldUseCanonicalHostUrls(options.requestOrigin)) {
    return null;
  }

  const canonicalHost = getCanonicalTenantHost(options.shop);
  if (!canonicalHost) {
    return null;
  }

  const canonicalOrigin = buildOriginWithHost(canonicalHost, options.requestOrigin);
  if (!canonicalOrigin) {
    return null;
  }

  const canonicalPath = resolveCanonicalPublicPathFromLegacyPath(
    options.pathname,
    options.shop.slug,
  );
  if (!canonicalPath) {
    return null;
  }

  const search = String(options.search || '');
  return `${canonicalOrigin}${canonicalPath}${search}`;
}
