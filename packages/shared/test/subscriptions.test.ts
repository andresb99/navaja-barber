import { describe, expect, it } from 'vitest';
import {
  appendSubscriptionBillingMessage,
  getSubscriptionBillingMessageFromUrl,
  getSubscriptionPlanDescriptor,
  getSubscriptionPriceCents,
  normalizeSubscriptionStatus,
  normalizeSubscriptionTier,
  PUBLIC_MARKETPLACE_PLANS,
  publicMarketingHomeKeyRoutes,
  resolveSubscriptionBillingMessage,
} from '../src';

describe('subscription catalog', () => {
  it('exposes only public marketplace plans for pricing surfaces', () => {
    expect(PUBLIC_MARKETPLACE_PLANS).toEqual(['free', 'pro', 'business']);
  });

  it('returns correct price for monthly and annual installments', () => {
    expect(getSubscriptionPriceCents('pro', 'monthly')).toBe(149000);
    expect(getSubscriptionPriceCents('business', 'annual_installments')).toBe(309000);
  });

  it('normalizes unknown tier and status values safely', () => {
    expect(normalizeSubscriptionTier('unknown')).toBe('free');
    expect(normalizeSubscriptionStatus('broken')).toBe('active');
  });

  it('keeps shared public route coverage aligned with core public surfaces', () => {
    expect(publicMarketingHomeKeyRoutes.map((item) => item.href)).toEqual([
      '/software-para-barberias',
      '/agenda-para-barberos',
      '/shops',
      '/suscripcion',
    ]);
    expect(getSubscriptionPlanDescriptor('business').name).toBe('Business');
  });

  it('normalizes and appends subscription billing state for web and mobile returns', () => {
    expect(resolveSubscriptionBillingMessage(['success'])).toBe('success');
    expect(resolveSubscriptionBillingMessage('broken')).toBeNull();

    const mobileReturnUrl = appendSubscriptionBillingMessage(
      'navajastaff://suscripcion',
      'pending',
      'barberia-demo',
    );

    expect(mobileReturnUrl).toBe('navajastaff://suscripcion?billing=pending&shop=barberia-demo');
    expect(getSubscriptionBillingMessageFromUrl(mobileReturnUrl)).toBe('pending');
  });
});
