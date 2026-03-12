export type SubscriptionBillingMessage = 'success' | 'pending' | 'failure';

export function resolveSubscriptionBillingMessage(
  value: string | string[] | null | undefined,
): SubscriptionBillingMessage | null {
  const normalized = Array.isArray(value) ? value[0] : value;
  const candidate = String(normalized || '')
    .trim()
    .toLowerCase();

  if (candidate === 'success' || candidate === 'pending' || candidate === 'failure') {
    return candidate;
  }

  return null;
}

export function appendSubscriptionBillingMessage(
  baseUrl: string,
  billing: SubscriptionBillingMessage,
  shopSlug?: string | null,
) {
  const url = new URL(baseUrl);
  url.searchParams.set('billing', billing);

  const normalizedShopSlug = String(shopSlug || '').trim();
  if (normalizedShopSlug) {
    url.searchParams.set('shop', normalizedShopSlug);
  }

  return url.toString();
}

export function getSubscriptionBillingMessageFromUrl(urlValue: string) {
  try {
    const url = new URL(urlValue);
    return resolveSubscriptionBillingMessage(url.searchParams.get('billing'));
  } catch {
    return null;
  }
}
