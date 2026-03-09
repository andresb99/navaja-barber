import { createClient } from '@supabase/supabase-js';
import {
  resolveTenantByHost,
  type ResolvedTenantHostMatch,
  type ResolvedTenantLookupRecord,
} from '@/lib/custom-domains';
import { getPlatformHostConfig } from '@/lib/platform-host-config';

interface HeaderReader {
  get(name: string): string | null;
}

interface HostResolutionRpcRow {
  shop_id: string;
  shop_slug: string;
  shop_status: string;
  custom_domain: string | null;
  plan: string | null;
  subscription_status: string | null;
  domain_status: string | null;
}

export function getForwardedHost(headers: HeaderReader) {
  return headers.get('x-forwarded-host') || headers.get('host') || null;
}

export async function lookupTenantHostRecord(field: 'custom_domain' | 'slug', value: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.rpc('resolve_public_shop_host', {
    p_custom_domain: field === 'custom_domain' ? value : null,
    p_slug: field === 'slug' ? value : null,
  });

  if (error || !Array.isArray(data) || !data[0]) {
    return null;
  }

  const row = data[0] as HostResolutionRpcRow;
  return {
    shopId: String(row.shop_id),
    shopSlug: String(row.shop_slug),
    shopStatus: String(row.shop_status || 'active'),
    customDomain: row.custom_domain,
    plan: row.plan,
    subscriptionStatus: row.subscription_status,
    domainStatus: row.domain_status,
  } satisfies ResolvedTenantLookupRecord;
}

export async function resolveTenantFromHost(
  host: string | null | undefined,
): Promise<ResolvedTenantHostMatch | null> {
  const normalizedHost = String(host || '').trim();
  if (!normalizedHost) {
    return null;
  }

  return resolveTenantByHost(normalizedHost, {
    config: getPlatformHostConfig(),
    lookup: {
      findByCustomDomain(domain) {
        return lookupTenantHostRecord('custom_domain', domain);
      },
      findBySlug(slug) {
        return lookupTenantHostRecord('slug', slug);
      },
    },
  });
}

export function resolveTenantFromHeaders(headers: HeaderReader) {
  return resolveTenantFromHost(getForwardedHost(headers));
}
