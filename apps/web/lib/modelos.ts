import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getDefaultMarketplaceShop } from '@/lib/shops';

export interface OpenModelCall {
  session_id: string;
  course_title: string;
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

function getModelCategoriesFromRequirements(input: unknown): string[] {
  if (!input || typeof input !== 'object') {
    return [];
  }

  return normalizeModelCategories((input as Record<string, unknown>).categories);
}

export async function listMarketplaceOpenModelCalls(): Promise<MarketplaceOpenModelCall[]> {
  const supabase = createSupabaseAdminClient();

  const { data: requirementsRows } = await supabase
    .from('model_requirements')
    .select('session_id, requirements, compensation_type, compensation_value_cents, notes_public, is_open')
    .eq('is_open', true);

  if (!requirementsRows?.length) {
    return [];
  }

  const sessionIds = requirementsRows.map((row) => String(row.session_id));
  const { data: sessionRows } = await supabase
    .from('course_sessions')
    .select('id, course_id, start_at, location, status')
    .in('id', sessionIds)
    .eq('status', 'scheduled');

  if (!sessionRows?.length) {
    return [];
  }

  const courseIds = sessionRows.map((row) => String(row.course_id));
  const { data: courseRows } = await supabase
    .from('courses')
    .select('id, title, shop_id, is_active, model_categories')
    .in('id', courseIds)
    .eq('is_active', true);

  if (!courseRows?.length) {
    return [];
  }

  const shopIds = [...new Set(courseRows.map((row) => String(row.shop_id)))];
  const { data: shopRows } = await supabase
    .from('shops')
    .select('id, name, slug, status, custom_domain, domain_status')
    .in('id', shopIds)
    .eq('status', 'active');

  const { data: subscriptionRows } = await supabase
    .from('subscriptions')
    .select('shop_id, plan, status')
    .in('shop_id', shopIds);

  const sessionsById = new Map(sessionRows.map((row) => [String(row.id), row]));
  const coursesById = new Map(courseRows?.map((row) => [String(row.id), row]) || []);
  const shopsById = new Map((shopRows || []).map((row) => [String(row.id), row]));
  const subscriptionsByShopId = new Map<string, ShopSubscriptionRow>(
    ((subscriptionRows || []) as ShopSubscriptionRow[]).map((row) => [String(row.shop_id), row]),
  );

  return requirementsRows
    .map((req) => {
      const session = sessionsById.get(String(req.session_id));
      if (!session) {
        return null;
      }

      const course = coursesById.get(String(session.course_id));
      if (!course) {
        return null;
      }

      const shop = shopsById.get(String(course.shop_id));
      if (!shop) {
        return null;
      }
      const subscription = subscriptionsByShopId.get(String(shop.id));

      const categoriesFromRequirements = getModelCategoriesFromRequirements(req.requirements);
      const categoriesFromCourse = normalizeModelCategories(course.model_categories);

      const item: MarketplaceOpenModelCall = {
        session_id: String(req.session_id),
        shop_id: String(shop.id),
        shop_name: String(shop.name),
        shop_slug: String(shop.slug),
        custom_domain: shop.custom_domain ? String(shop.custom_domain) : null,
        domain_status: shop.domain_status ? String(shop.domain_status) : null,
        plan: subscription?.plan || 'free',
        subscription_status: subscription?.status || 'active',
        course_title: String(course.title),
        start_at: String(session.start_at),
        location: String(session.location),
        model_categories:
          categoriesFromRequirements.length > 0 ? categoriesFromRequirements : categoriesFromCourse,
        compensation_type: req.compensation_type as 'gratis' | 'descuento' | 'pago',
        compensation_value_cents:
          req.compensation_value_cents === null ? null : Number(req.compensation_value_cents || 0),
        notes_public: req.notes_public ? String(req.notes_public) : null,
        models_needed: getModelsNeededFromRequirements(req.requirements),
      };

      return item;
    })
    .filter((item): item is MarketplaceOpenModelCall => item !== null)
    .sort((a, b) => (a.start_at < b.start_at ? -1 : 1));
}

export async function getOpenModelCalls(shopId?: string): Promise<OpenModelCall[]> {
  let resolvedShopId = shopId;

  if (!resolvedShopId) {
    const defaultShop = await getDefaultMarketplaceShop();
    resolvedShopId = defaultShop?.id;
  }

  if (!resolvedShopId) {
    return [];
  }

  const calls = await listMarketplaceOpenModelCalls();
  return calls
    .filter((call) => call.shop_id === resolvedShopId)
    .map((call) => ({
      session_id: call.session_id,
      course_title: call.course_title,
      start_at: call.start_at,
      location: call.location,
      model_categories: call.model_categories,
      compensation_type: call.compensation_type,
      compensation_value_cents: call.compensation_value_cents,
      notes_public: call.notes_public,
      models_needed: call.models_needed,
    }));
}
