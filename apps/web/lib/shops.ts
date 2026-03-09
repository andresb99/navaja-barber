import 'server-only';

import { cache } from 'react';
import { normalizeShopSlug } from '@/lib/shop-links';
import { mockMarketplaceShops } from '@/lib/test-fixtures/shops';
import { isMockRuntime } from '@/lib/test-runtime';

interface ShopRow {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  description: string | null;
  phone: string | null;
  is_verified: boolean | null;
  logo_url: string | null;
  cover_image_url: string | null;
  status: string;
  custom_domain: string | null;
  domain_status: string | null;
}

interface ShopSubscriptionRow {
  shop_id: string;
  plan: string | null;
  status: string | null;
}

interface ShopLocationRow {
  shop_id: string;
  label: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ShopReviewRow {
  shop_id: string;
  rating: number | null;
}

interface ShopServiceRow {
  shop_id: string;
  price_cents: number | null;
}

interface ShopGalleryRow {
  shop_id: string;
  public_url: string | null;
  sort_order: number | null;
  created_at: string | null;
}

export type MarketplaceSearchMode = 'all' | 'name' | 'area' | 'nearby';

export interface MarketplaceShop {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  description: string | null;
  phone: string | null;
  isVerified: boolean;
  logoUrl: string | null;
  coverImageUrl: string | null;
  imageUrls: string[];
  locationLabel: string | null;
  city: string | null;
  region: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  reviewCount: number;
  averageRating: number | null;
  activeServiceCount: number;
  minServicePriceCents: number | null;
  customDomain: string | null;
  domainStatus: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
}

function buildMarketplaceShop(
  shop: ShopRow,
  location: ShopLocationRow | undefined,
  reviews: ShopReviewRow[],
  services: ShopServiceRow[],
  galleryImages: ShopGalleryRow[],
  subscription: ShopSubscriptionRow | undefined,
): MarketplaceShop {
  const validRatings = reviews
    .map((item) => Number(item.rating))
    .filter((item) => Number.isFinite(item) && item >= 1 && item <= 5);
  const reviewCount = validRatings.length;
  const ratingTotal = validRatings.reduce((sum, current) => sum + current, 0);
  const validPrices = services
    .map((item) => Number(item.price_cents))
    .filter((item) => Number.isFinite(item) && item >= 0);
  const imageUrls = Array.from(
    new Set(
      [shop.cover_image_url, ...galleryImages.map((item) => item.public_url)]
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  );

  return {
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    timezone: shop.timezone,
    description: shop.description,
    phone: shop.phone,
    isVerified: Boolean(shop.is_verified),
    logoUrl: shop.logo_url,
    coverImageUrl: shop.cover_image_url || imageUrls[0] || null,
    imageUrls,
    locationLabel: location?.label || null,
    city: location?.city || null,
    region: location?.region || null,
    countryCode: location?.country_code || null,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    reviewCount,
    averageRating: reviewCount > 0 ? ratingTotal / reviewCount : null,
    activeServiceCount: validPrices.length,
    minServicePriceCents: validPrices.length > 0 ? Math.min(...validPrices) : null,
    customDomain: shop.custom_domain,
    domainStatus: shop.domain_status,
    plan: subscription?.plan || 'free',
    subscriptionStatus: subscription?.status || 'active',
  };
}

function normalizeSearchValue(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getDistanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const latitudeA = toRadians(fromLatitude);
  const latitudeB = toRadians(toLatitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getNameMatchScore(shop: MarketplaceShop, normalizedQuery: string) {
  if (!normalizedQuery) {
    return -1;
  }

  const normalizedName = normalizeSearchValue(shop.name);
  const normalizedSlug = normalizeSearchValue(shop.slug).replace(/-/g, ' ');
  let score = -1;

  if (normalizedName === normalizedQuery) {
    score = Math.max(score, 1200);
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    score = Math.max(score, 900);
  }

  if (normalizedName.includes(normalizedQuery)) {
    score = Math.max(score, 700);
  }

  if (normalizedSlug.includes(normalizedQuery)) {
    score = Math.max(score, 620);
  }

  const nameWords = normalizedName.split(/\s+/).filter(Boolean);
  if (nameWords.some((word) => word.startsWith(normalizedQuery))) {
    score = Math.max(score, 560);
  }

  if (score < 0) {
    return -1;
  }

  return score + shop.reviewCount * 2 + (shop.averageRating || 0) * 10;
}

function getAreaMatchScore(shop: MarketplaceShop, normalizedQuery: string) {
  if (!normalizedQuery) {
    return -1;
  }

  const locationFields = [shop.locationLabel, shop.city, shop.region]
    .map((value) => normalizeSearchValue(value))
    .filter(Boolean);

  let score = -1;

  for (const field of locationFields) {
    if (field === normalizedQuery) {
      score = Math.max(score, 950);
      continue;
    }

    if (field.startsWith(normalizedQuery)) {
      score = Math.max(score, 760);
      continue;
    }

    if (field.includes(normalizedQuery)) {
      score = Math.max(score, 620);
    }
  }

  const description = normalizeSearchValue(shop.description);
  if (description.includes(normalizedQuery)) {
    score = Math.max(score, 420);
  }

  if (score < 0) {
    return -1;
  }

  return score + shop.reviewCount + (shop.isVerified ? 20 : 0);
}

function takeTopShops(
  entries: Array<{ shop: MarketplaceShop; score: number }>,
  limit: number,
): MarketplaceShop[] {
  return entries
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.shop);
}

interface SearchMarketplaceShopsOptions {
  query?: string | null;
  intent?: 'smart' | 'name' | 'area';
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
  limit?: number;
}

interface MarketplaceViewportShopsOptions {
  north: number;
  south: number;
  east: number;
  west: number;
  limit?: number;
}

export async function searchMarketplaceShops(options: SearchMarketplaceShopsOptions): Promise<{
  items: MarketplaceShop[];
  mode: MarketplaceSearchMode;
}> {
  const {
    query,
    intent = 'smart',
    latitude = null,
    longitude = null,
    radiusKm = 18,
    limit = 24,
  } = options;
  const allShops = await listMarketplaceShops();

  if (latitude !== null && longitude !== null) {
    const nearby = allShops
      .filter((shop) => shop.latitude !== null && shop.longitude !== null)
      .map((shop) => ({
        shop,
        distanceKm: getDistanceKm(latitude, longitude, Number(shop.latitude), Number(shop.longitude)),
      }))
      .sort((left, right) => left.distanceKm - right.distanceKm);

    const withinRadius = nearby.filter((entry) => entry.distanceKm <= radiusKm);
    const items = withinRadius.slice(0, limit).map((entry) => entry.shop);
    return { items, mode: 'nearby' };
  }

  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return { items: allShops.slice(0, limit), mode: 'all' };
  }

  const nameMatches = takeTopShops(
    allShops.map((shop) => ({
      shop,
      score: getNameMatchScore(shop, normalizedQuery),
    })),
    limit,
  );

  const areaMatches = takeTopShops(
    allShops.map((shop) => ({
      shop,
      score: getAreaMatchScore(shop, normalizedQuery),
    })),
    limit,
  );

  if (intent === 'name') {
    return { items: nameMatches, mode: 'name' };
  }

  if (intent === 'area') {
    return { items: areaMatches, mode: 'area' };
  }

  if (nameMatches.length > 0) {
    return { items: nameMatches, mode: 'name' };
  }

  return { items: areaMatches, mode: 'area' };
}

export async function listMarketplaceShopsInBounds(
  options: MarketplaceViewportShopsOptions,
): Promise<MarketplaceShop[]> {
  const { north, south, east, west, limit = 24 } = options;

  if (isMockRuntime()) {
    return mockMarketplaceShops
      .filter((shop) => {
        if (shop.latitude === null || shop.longitude === null) {
          return false;
        }

        return (
          shop.latitude >= south &&
          shop.latitude <= north &&
          shop.longitude >= west &&
          shop.longitude <= east
        );
      })
      .slice(0, limit);
  }

  const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createSupabaseAdminClient();
  const { data: locationRows, error: locationError } = await supabase
    .from('shop_locations')
    .select('shop_id, label, city, region, country_code, latitude, longitude')
    .eq('is_public', true)
    .gte('latitude', south)
    .lte('latitude', north)
    .gte('longitude', west)
    .lte('longitude', east)
    .order('shop_id');

  if (locationError || !locationRows?.length) {
    return [];
  }

  const locationsByShopId = new Map<string, ShopLocationRow>();
  for (const item of locationRows as ShopLocationRow[]) {
    const shopId = String(item.shop_id);
    if (!locationsByShopId.has(shopId)) {
      locationsByShopId.set(shopId, item);
    }

    if (locationsByShopId.size >= limit) {
      break;
    }
  }

  const shopIds = Array.from(locationsByShopId.keys());
  if (!shopIds.length) {
    return [];
  }

  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select(
      'id, name, slug, timezone, description, phone, is_verified, logo_url, cover_image_url, status, custom_domain, domain_status',
    )
    .in('id', shopIds)
    .eq('status', 'active');

  if (shopsError || !shops?.length) {
    return [];
  }

  const shopById = new Map(((shops || []) as ShopRow[]).map((item) => [String(item.id), item]));
  const activeShopIds = shopIds.filter((shopId) => shopById.has(shopId));

  if (!activeShopIds.length) {
    return [];
  }

  const [{ data: reviews }, { data: services }, { data: galleryImages }, { data: subscriptions }] =
    await Promise.all([
      supabase
        .from('appointment_reviews')
        .select('shop_id, rating')
        .in('shop_id', activeShopIds)
        .eq('status', 'published')
        .eq('is_verified', true),
      supabase
        .from('services')
        .select('shop_id, price_cents')
        .in('shop_id', activeShopIds)
        .eq('is_active', true),
      supabase
        .from('shop_gallery_images')
        .select('shop_id, public_url, sort_order, created_at')
        .in('shop_id', activeShopIds)
        .order('sort_order')
        .order('created_at'),
      supabase.from('subscriptions').select('shop_id, plan, status').in('shop_id', activeShopIds),
    ]);

  const reviewsByShopId = new Map<string, ShopReviewRow[]>();
  const servicesByShopId = new Map<string, ShopServiceRow[]>();
  const galleryByShopId = new Map<string, ShopGalleryRow[]>();
  const subscriptionsByShopId = new Map<string, ShopSubscriptionRow>(
    ((subscriptions || []) as ShopSubscriptionRow[]).map((item) => [String(item.shop_id), item]),
  );

  ((reviews || []) as ShopReviewRow[]).forEach((item) => {
    const shopId = String(item.shop_id);
    const current = reviewsByShopId.get(shopId) || [];
    current.push(item);
    reviewsByShopId.set(shopId, current);
  });

  ((services || []) as ShopServiceRow[]).forEach((item) => {
    const shopId = String(item.shop_id);
    const current = servicesByShopId.get(shopId) || [];
    current.push(item);
    servicesByShopId.set(shopId, current);
  });

  ((galleryImages || []) as ShopGalleryRow[]).forEach((item) => {
    const shopId = String(item.shop_id);
    const current = galleryByShopId.get(shopId) || [];
    current.push(item);
    galleryByShopId.set(shopId, current);
  });

  return activeShopIds
    .map((shopId) => {
      const shop = shopById.get(shopId);
      if (!shop) {
        return null;
      }

      return buildMarketplaceShop(
        shop,
        locationsByShopId.get(shopId),
        reviewsByShopId.get(shopId) || [],
        servicesByShopId.get(shopId) || [],
        galleryByShopId.get(shopId) || [],
        subscriptionsByShopId.get(shopId),
      );
    })
    .filter((item): item is MarketplaceShop => item !== null);
}

export const listMarketplaceShops = cache(async (): Promise<MarketplaceShop[]> => {
  if (isMockRuntime()) {
    return mockMarketplaceShops;
  }

  const { createSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createSupabaseAdminClient();
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select(
      'id, name, slug, timezone, description, phone, is_verified, logo_url, cover_image_url, status, custom_domain, domain_status',
    )
    .eq('status', 'active')
    .order('is_verified', { ascending: false })
    .order('published_at', { ascending: false })
    .order('name');

  if (shopsError || !shops?.length) {
    return [];
  }

  const shopIds = shops.map((item) => String(item.id));
  const [{ data: locations }, { data: reviews }, { data: services }, { data: galleryImages }, { data: subscriptions }] =
    await Promise.all([
      supabase
        .from('shop_locations')
        .select('shop_id, label, city, region, country_code, latitude, longitude')
        .in('shop_id', shopIds)
        .eq('is_public', true),
      supabase
        .from('appointment_reviews')
        .select('shop_id, rating')
        .in('shop_id', shopIds)
        .eq('status', 'published')
        .eq('is_verified', true),
      supabase
        .from('services')
        .select('shop_id, price_cents')
        .in('shop_id', shopIds)
        .eq('is_active', true),
      supabase
        .from('shop_gallery_images')
        .select('shop_id, public_url, sort_order, created_at')
        .in('shop_id', shopIds)
        .order('sort_order')
        .order('created_at'),
      supabase.from('subscriptions').select('shop_id, plan, status').in('shop_id', shopIds),
    ]);

  const locationsByShopId = new Map(
    ((locations || []) as ShopLocationRow[]).map((item) => [String(item.shop_id), item]),
  );
  const reviewsByShopId = new Map<string, ShopReviewRow[]>();
  const servicesByShopId = new Map<string, ShopServiceRow[]>();
  const galleryByShopId = new Map<string, ShopGalleryRow[]>();
  const subscriptionsByShopId = new Map<string, ShopSubscriptionRow>(
    ((subscriptions || []) as ShopSubscriptionRow[]).map((item) => [String(item.shop_id), item]),
  );

  ((reviews || []) as ShopReviewRow[]).forEach((item) => {
    const shopId = String(item.shop_id);
    const current = reviewsByShopId.get(shopId) || [];
    current.push(item);
    reviewsByShopId.set(shopId, current);
  });

  ((services || []) as ShopServiceRow[]).forEach((item) => {
    const shopId = String(item.shop_id);
    const current = servicesByShopId.get(shopId) || [];
    current.push(item);
    servicesByShopId.set(shopId, current);
  });

  ((galleryImages || []) as ShopGalleryRow[]).forEach((item) => {
    const shopId = String(item.shop_id);
    const current = galleryByShopId.get(shopId) || [];
    current.push(item);
    galleryByShopId.set(shopId, current);
  });

  return (shops as ShopRow[]).map((shop) =>
    buildMarketplaceShop(
      shop,
      locationsByShopId.get(shop.id),
      reviewsByShopId.get(shop.id) || [],
      servicesByShopId.get(shop.id) || [],
      galleryByShopId.get(shop.id) || [],
      subscriptionsByShopId.get(shop.id),
    ),
  );
});

export const getMarketplaceShopBySlug = cache(
  async (slug: string): Promise<MarketplaceShop | null> => {
    const normalized = normalizeShopSlug(slug);
    if (!normalized) {
      return null;
    }

    const shops = await listMarketplaceShops();
    return shops.find((item) => item.slug === normalized) || null;
  },
);

export const getDefaultMarketplaceShop = cache(async (): Promise<MarketplaceShop | null> => {
  const shops = await listMarketplaceShops();
  return shops[0] || null;
});
