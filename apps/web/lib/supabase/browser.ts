import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

function getAuthCookieDomain(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Single-label hosts like bare "localhost" can't share cookies across subdomains
  // (Chrome rejects domain=.localhost per RFC 6265). Use lvh.me in dev instead.
  if (parts.length < 2) {
    return undefined;
  }

  // Use the last 3 parts for known 2-label TLDs (e.g. vercel.app, lvh.me)
  // otherwise last 2 parts covers most real domains and lvh.me itself.
  return '.' + parts.slice(-Math.min(parts.length, 3)).join('.');
}

export function createSupabaseBrowserClient() {
  const domain = getAuthCookieDomain();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookieOptions: domain ? { domain } : {},
  });
}

