import { normalizeShopSlug } from '@/lib/shop-links';
import { getPlatformAppUrl, getPlatformHostConfig } from '@/lib/platform-host-config';

type QueryParamPrimitive = string | number | boolean;
type QueryParamValue =
  | QueryParamPrimitive
  | null
  | undefined
  | Array<QueryParamPrimitive | null | undefined>;

function appendQueryValue(searchParams: URLSearchParams, key: string, value: QueryParamValue) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      appendQueryValue(searchParams, key, entry);
    }
    return;
  }

  if (value === null || value === undefined) {
    return;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return;
  }

  searchParams.append(key, normalized);
}

export function buildAppHref(
  pathname: string,
  query?: Record<string, QueryParamValue>,
) {
  const url = new URL(pathname, 'http://localhost');

  for (const [key, value] of Object.entries(query || {})) {
    appendQueryValue(url.searchParams, key, value);
  }

  const search = url.searchParams.toString();
  return search ? `${url.pathname}?${search}` : url.pathname;
}

export function buildWorkspaceHref(
  pathname: string,
  shopSlug?: string | null,
  query?: Record<string, QueryParamValue>,
) {
  return buildAppHref(pathname, {
    shop: shopSlug || undefined,
    ...(query || {}),
  });
}

export function buildAdminHref(
  pathname: string,
  shopSlug?: string | null,
  query?: Record<string, QueryParamValue>,
) {
  return buildWorkspaceHref(pathname, shopSlug, query);
}

export function buildStaffHref(
  pathname: string,
  shopSlug?: string | null,
  query?: Record<string, QueryParamValue>,
) {
  return buildWorkspaceHref(pathname, shopSlug, query);
}

function getOriginForTenantWorkspace(requestOrigin?: string | null) {
  const normalizedOrigin = String(requestOrigin || '').trim() || getPlatformAppUrl() || '';
  if (!normalizedOrigin) {
    return null;
  }

  try {
    const originUrl = new URL(normalizedOrigin);
    if (originUrl.hostname === '0.0.0.0') {
      originUrl.hostname = 'localhost';
    }

    return originUrl;
  } catch {
    return null;
  }
}

function buildTenantWorkspaceOrigin(shopSlug: string, requestOrigin?: string | null) {
  const normalizedShopSlug = normalizeShopSlug(shopSlug);
  const originUrl = getOriginForTenantWorkspace(requestOrigin);
  const { rootDomain } = getPlatformHostConfig();

  if (!normalizedShopSlug || !originUrl || !rootDomain) {
    return null;
  }

  return `${originUrl.protocol}//${normalizedShopSlug}.${rootDomain}${originUrl.port ? `:${originUrl.port}` : ''}`;
}

export function buildTenantWorkspaceHref(
  pathname: string,
  shopSlug?: string | null,
  query?: Record<string, QueryParamValue>,
  options?: {
    requestOrigin?: string | null;
  },
) {
  if (!shopSlug) {
    return buildAppHref(pathname, query);
  }

  const tenantOrigin = buildTenantWorkspaceOrigin(shopSlug, options?.requestOrigin ?? null);
  if (!tenantOrigin) {
    return buildWorkspaceHref(pathname, shopSlug, query);
  }

  return new URL(buildAppHref(pathname, query), `${tenantOrigin}/`).toString();
}

export function buildTenantAdminHref(
  pathname: string,
  shopSlug?: string | null,
  query?: Record<string, QueryParamValue>,
  options?: {
    requestOrigin?: string | null;
  },
) {
  return buildTenantWorkspaceHref(pathname, shopSlug, query, options);
}

export function buildTenantStaffHref(
  pathname: string,
  shopSlug?: string | null,
  query?: Record<string, QueryParamValue>,
  options?: {
    requestOrigin?: string | null;
  },
) {
  return buildTenantWorkspaceHref(pathname, shopSlug, query, options);
}
