import {
  isLocalDevelopmentHost,
  normalizeHostPattern,
  type PlatformHostConfig,
} from '@/lib/custom-domains';

export function getPlatformAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return appUrl?.trim() || null;
}

function getHostFromAppUrl() {
  try {
    const appUrl = getPlatformAppUrl();
    return appUrl ? new URL(appUrl).host : null;
  } catch {
    return null;
  }
}

/** Apex for subdomain suffix checks (e.g. `tenant.${rootDomain}`); `www.` is not a valid parent for labels. */
function normalizeExplicitRootDomain(value: string | null | undefined) {
  const normalized = normalizeHostPattern(value || '');
  if (!normalized) {
    return null;
  }

  return normalized.replace(/^www\./, '') || normalized;
}

export function getPlatformHostConfig(): PlatformHostConfig {
  const appHost = normalizeHostPattern(getHostFromAppUrl());
  const fallbackRootDomain = appHost && isLocalDevelopmentHost(appHost) ? 'localhost' : appHost;
  const rootDomain =
    normalizeExplicitRootDomain(process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN) ||
    normalizeHostPattern(fallbackRootDomain ? fallbackRootDomain.replace(/^www\./, '') : '');

  return {
    appHost,
    rootDomain,
  };
}
