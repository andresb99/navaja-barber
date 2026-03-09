import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getPlatformAppUrl } from '@/lib/platform-host-config';
import { getRequestOriginFromHeaders } from '@/lib/request-origin';
import { getMarketplaceShopBySlug, listMarketplaceShops, type MarketplaceShop } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  buildTenantCanonicalCourseHref,
  buildTenantCanonicalHref,
  type TenantPublicAddress,
} from '@/lib/tenant-public-urls';
import { resolveTenantFromHeaders } from '@/lib/tenant-host-resolution';

export const revalidate = 3600;

interface CourseSitemapRow {
  id: string;
  shop_id: string;
  created_at: string | null;
  updated_at: string | null;
}

function resolveLastModified(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) {
      continue;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function buildAbsoluteUrl(origin: string, pathname: string) {
  return new URL(pathname, origin).toString();
}

function buildMarketplaceEntries(origin: string): MetadataRoute.Sitemap {
  return [
    {
      url: buildAbsoluteUrl(origin, '/shops'),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: buildAbsoluteUrl(origin, '/book'),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: buildAbsoluteUrl(origin, '/courses'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: buildAbsoluteUrl(origin, '/jobs'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: buildAbsoluteUrl(origin, '/modelos'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: buildAbsoluteUrl(origin, '/suscripcion'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: buildAbsoluteUrl(origin, '/software-para-barberias'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: buildAbsoluteUrl(origin, '/agenda-para-barberos'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];
}

function toTenantPublicAddress(shop: MarketplaceShop): TenantPublicAddress {
  return {
    slug: shop.slug,
    status: 'active',
    customDomain: shop.customDomain,
    domainStatus: shop.domainStatus,
    plan: shop.plan,
    subscriptionStatus: shop.subscriptionStatus,
  };
}

function buildTenantEntries(shop: TenantPublicAddress, requestOrigin: string): MetadataRoute.Sitemap {
  return [
    {
      url: buildTenantCanonicalHref(shop, 'profile', { requestOrigin }),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: buildTenantCanonicalHref(shop, 'jobs', { requestOrigin }),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: buildTenantCanonicalHref(shop, 'courses', { requestOrigin }),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: buildTenantCanonicalHref(shop, 'modelos', { requestOrigin }),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];
}

function buildCourseEntries(
  courses: CourseSitemapRow[],
  shopsById: Map<string, MarketplaceShop>,
  requestOrigin: string,
): MetadataRoute.Sitemap {
  return courses.flatMap((course) => {
    const shop = shopsById.get(String(course.shop_id));
    if (!shop) {
      return [];
    }

    return [
      {
        url: buildTenantCanonicalCourseHref(toTenantPublicAddress(shop), String(course.id), {
          requestOrigin,
        }),
        lastModified: resolveLastModified(course.updated_at, course.created_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      },
    ];
  });
}

async function listActiveCourseRows(shopIds: string[]) {
  if (!shopIds.length) {
    return [] as CourseSitemapRow[];
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('courses')
    .select('id, shop_id, created_at, updated_at')
    .in('shop_id', shopIds)
    .eq('is_active', true);

  return (data || []) as CourseSitemapRow[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerStore = await headers();
  const requestOrigin = getRequestOriginFromHeaders(headerStore) || getPlatformAppUrl();

  if (!requestOrigin) {
    return [];
  }

  const tenantMatch = await resolveTenantFromHeaders(headerStore);
  if (tenantMatch) {
    const shop = await getMarketplaceShopBySlug(tenantMatch.shopSlug);
    if (!shop) {
      return [];
    }

    const tenantAddress = toTenantPublicAddress(shop);
    const courseRows = await listActiveCourseRows([shop.id]);

    return [
      ...buildTenantEntries(tenantAddress, requestOrigin),
      ...buildCourseEntries(courseRows, new Map([[shop.id, shop]]), requestOrigin),
    ];
  }

  const siteOrigin = getPlatformAppUrl() || requestOrigin;
  const shops = await listMarketplaceShops();
  const courseRows = await listActiveCourseRows(shops.map((shop) => shop.id));
  const shopsById = new Map(shops.map((shop) => [shop.id, shop]));

  return [
    ...buildMarketplaceEntries(siteOrigin),
    ...shops.flatMap((shop) => buildTenantEntries(toTenantPublicAddress(shop), siteOrigin)),
    ...buildCourseEntries(courseRows, shopsById, siteOrigin),
  ];
}
