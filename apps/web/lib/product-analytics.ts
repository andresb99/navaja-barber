import 'server-only';

import { createSupabaseAdminClient } from './supabase/admin';

export type ProductEventSource = 'web' | 'mobile' | 'api' | 'system';

export interface TrackProductEventInput {
  eventName: string;
  shopId?: string | null;
  userId?: string | null;
  customerId?: string | null;
  source?: ProductEventSource;
  metadata?: Record<string, unknown> | null;
}

export interface ProductFunnelSnapshot {
  sinceIso: string;
  counts: Record<string, number>;
  stalePendingIntents: number;
  refundedIntents: number;
}

function normalizeEventName(value: string) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.length < 3 || normalized.length > 120) {
    return null;
  }

  return normalized;
}

function normalizeSource(value: ProductEventSource | null | undefined): ProductEventSource {
  if (value === 'web' || value === 'mobile' || value === 'api' || value === 'system') {
    return value;
  }

  return 'api';
}

function normalizeUuid(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export async function trackProductEvent(input: TrackProductEventInput) {
  const eventName = normalizeEventName(input.eventName);
  if (!eventName) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('product_events').insert({
    event_name: eventName,
    shop_id: normalizeUuid(input.shopId),
    user_id: normalizeUuid(input.userId),
    customer_id: normalizeUuid(input.customerId),
    source: normalizeSource(input.source),
    metadata: input.metadata || {},
  });

  if (error) {
    // Best effort instrumentation; never block core product flows.
    console.warn('No se pudo registrar product_event:', error.message);
  }
}

function countByEventName(rows: Array<{ event_name?: string | null }>) {
  const counts: Record<string, number> = {};

  for (const row of rows) {
    const eventName = normalizeEventName(row.event_name || '');
    if (!eventName) {
      continue;
    }

    counts[eventName] = (counts[eventName] || 0) + 1;
  }

  return counts;
}

export async function getProductFunnelSnapshot(input: {
  shopId: string;
  sinceDays?: number;
  stalePendingMinutes?: number;
}): Promise<ProductFunnelSnapshot> {
  const sinceDays = Math.max(1, Math.min(Number(input.sinceDays || 30), 90));
  const stalePendingMinutes = Math.max(5, Math.min(Number(input.stalePendingMinutes || 30), 1440));
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const staleSince = new Date(Date.now() - stalePendingMinutes * 60 * 1000).toISOString();
  const supabase = createSupabaseAdminClient();

  const [{ data: productEvents, error: productEventsError }, { data: staleIntents, error: staleIntentsError }, { data: refundedIntents, error: refundedIntentsError }] =
    await Promise.all([
      supabase
        .from('product_events')
        .select('event_name')
        .eq('shop_id', normalizeUuid(input.shopId))
        .gte('created_at', since),
      supabase
        .from('payment_intents')
        .select('id')
        .eq('shop_id', normalizeUuid(input.shopId))
        .in('status', ['pending', 'processing'])
        .lte('created_at', staleSince),
      supabase
        .from('payment_intents')
        .select('id')
        .eq('shop_id', normalizeUuid(input.shopId))
        .eq('status', 'refunded')
        .gte('processed_at', since),
    ]);

  if (productEventsError) {
    throw new Error(productEventsError.message || 'No se pudieron cargar los eventos del producto.');
  }

  if (staleIntentsError) {
    throw new Error(staleIntentsError.message || 'No se pudieron cargar los pagos pendientes.');
  }

  if (refundedIntentsError) {
    throw new Error(refundedIntentsError.message || 'No se pudieron cargar los refunds.');
  }

  return {
    sinceIso: since,
    counts: countByEventName((productEvents || []) as Array<{ event_name?: string | null }>),
    stalePendingIntents: (staleIntents || []).length,
    refundedIntents: (refundedIntents || []).length,
  };
}
