import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getDefaultMarketplaceShop } from '@/lib/shops';

export interface OpenModelCall {
  session_id: string;
  course_title: string;
  course_level: string | null;
  course_duration: number | null;
  course_image_url: string | null;
  start_at: string;
  location: string;
  model_categories: string[];
  compensation_type: 'gratis' | 'descuento' | 'pago';
  compensation_value_cents: number | null;
  notes_public: string | null;
  models_needed: number;
}

export interface MarketplaceOpenModelCall extends OpenModelCall {
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  shop_logo_url: string | null;
  custom_domain: string | null;
  domain_status: string | null;
  plan: string | null;
  subscription_status: string | null;
}

interface ShopSubscriptionRow {
  shop_id: string;
  plan: string | null;
  status: string | null;
}

export function getModelsNeededFromRequirements(input: unknown): number {
  if (!input || typeof input !== 'object') {
    return 0;
  }
  const raw = (input as Record<string, unknown>).models_needed;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.trunc(parsed);
}

function normalizeModelCategories(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const category of input) {
    if (typeof category !== 'string') {
      continue;
    }

    const trimmed = category.trim();
    if (!trimmed) {
      continue;
    }

    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(trimmed);
  }

  return normalized;
}

export async function listMarketplaceOpenModelCalls(): Promise<MarketplaceOpenModelCall[]> {
  const supabase = createSupabaseAdminClient();

  // 1. Get explicit model requirements
  const { data: explicitRequirements } = await supabase
    .from('model_requirements')
    .select('session_id, requirements, compensation_type, compensation_value_cents, notes_public, is_open')
    .eq('is_open', true);

  // 2. Get active courses that require models
  const { data: coursesWithModels } = await supabase
    .from('courses')
    .select('id, title, shop_id, is_active, models_required, level, duration_hours, image_url')
    .eq('is_active', true)
    .gt('models_required', 0);

  if (!explicitRequirements?.length && !coursesWithModels?.length) {
    return [];
  }

  // 3. Get relevant sessions
  const explicitSessionIds = explicitRequirements?.map((row) => String(row.session_id)) || [];
  const courseIdsWithModels = coursesWithModels?.map((row) => String(row.id)) || [];

  const { data: sessionRows } = await supabase
    .from('course_sessions')
    .select('id, course_id, start_at, location, status')
    .or(`id.in.(${explicitSessionIds.join(',') || '00000000-0000-0000-0000-000000000000'}),course_id.in.(${courseIdsWithModels.join(',') || '00000000-0000-0000-0000-000000000000'})`)
    .eq('status', 'scheduled');

  if (!sessionRows?.length) {
    return [];
  }

  // 4. Get all relevant courses and shops
  const allCourseIds = [...new Set(sessionRows.map((row) => String(row.course_id)))];
  const { data: allCourseRows } = await supabase
    .from('courses')
    .select('id, title, shop_id, is_active, models_required, level, duration_hours, image_url')
    .in('id', allCourseIds)
    .eq('is_active', true);

  if (!allCourseRows?.length) {
    return [];
  }

  const shopIds = [...new Set(allCourseRows.map((row) => String(row.shop_id)))];
  const { data: shopRows } = await supabase
    .from('shops')
    .select('id, name, slug, status, custom_domain, domain_status, logo_url')
    .in('id', shopIds)
    .eq('status', 'active');

  const { data: subscriptionRows } = await supabase
    .from('subscriptions')
    .select('shop_id, plan, status')
    .in('shop_id', shopIds);

  const reqsBySessionId = new Map(explicitRequirements?.map((row) => [String(row.session_id), row]));
  const coursesById = new Map(allCourseRows.map((row) => [String(row.id), row]));
  const shopsById = new Map((shopRows || []).map((row) => [String(row.id), row]));
  const subscriptionsByShopId = new Map(
    ((subscriptionRows || []) as ShopSubscriptionRow[]).map((row) => [String(row.shop_id), row]),
  );

  return sessionRows
    .map((session) => {
      const course = coursesById.get(String(session.course_id));
      if (!course) return null;

      const shop = shopsById.get(String(course.shop_id));
      if (!shop) return null;

      const req = reqsBySessionId.get(String(session.id));
      const subscription = subscriptionsByShopId.get(String(shop.id));

      if (!req && course.models_required <= 0) return null;

      const item: MarketplaceOpenModelCall = {
        session_id: String(session.id),
        shop_id: String(shop.id),
        shop_name: String(shop.name),
        shop_slug: String(shop.slug),
        shop_logo_url: shop.logo_url ? String(shop.logo_url) : null,
        custom_domain: shop.custom_domain ? String(shop.custom_domain) : null,
        domain_status: shop.domain_status ? String(shop.domain_status) : null,
        plan: subscription?.plan || 'free',
        subscription_status: subscription?.status || 'active',
        course_title: String(course.title),
        course_level: course.level ? String(course.level) : null,
        course_duration: course.duration_hours ? Number(course.duration_hours) : null,
        course_image_url: course.image_url ? String(course.image_url) : null,
        start_at: String(session.start_at),
        location: String(session.location),
        model_categories: [], 
        compensation_type: (req?.compensation_type as any) || 'gratis',
        compensation_value_cents: req?.compensation_value_cents ? Number(req.compensation_value_cents) : null,
        notes_public: req?.notes_public || 'Se requiere modelo para práctica académica.',
        models_needed: req ? getModelsNeededFromRequirements(req.requirements) : (course.models_required || 1),
      };

      return item;
    })
    .filter((item): item is MarketplaceOpenModelCall => item !== null)
    .sort((a, b) => (a.start_at < b.start_at ? -1 : 1));
}

export async function getOpenModelCalls(shopId?: string): Promise<MarketplaceOpenModelCall[]> {
  let resolvedShopId = shopId;

  if (!resolvedShopId) {
    const defaultShop = await getDefaultMarketplaceShop();
    resolvedShopId = defaultShop?.id;
  }

  if (!resolvedShopId) {
    return [];
  }

  const calls = await listMarketplaceOpenModelCalls();
  return calls.filter((call) => call.shop_id === resolvedShopId);
}
