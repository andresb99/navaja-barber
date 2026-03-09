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
