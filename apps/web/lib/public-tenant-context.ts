import { headers } from 'next/headers';

export interface PublicTenantRouteContext {
  shopId: string | null;
  shopSlug: string | null;
  mode: 'path' | 'custom_domain' | 'platform_subdomain';
}

function resolveMode(value: string | null | undefined): PublicTenantRouteContext['mode'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'custom_domain' || normalized === 'platform_subdomain') {
    return normalized;
  }

  return 'path';
}

export async function getPublicTenantRouteContext(): Promise<PublicTenantRouteContext> {
  const headerStore = await headers();
  const shopId = headerStore.get('x-navaja-tenant-shop-id')?.trim() || null;
  const shopSlug = headerStore.get('x-navaja-tenant-shop-slug')?.trim() || null;
  const mode = resolveMode(headerStore.get('x-navaja-tenant-mode'));

  if (!shopSlug || mode === 'path') {
    return {
      shopId: shopId || null,
      shopSlug: shopSlug || null,
      mode: 'path',
    };
  }

  return {
    shopId: shopId || null,
    shopSlug,
    mode,
  };
}
