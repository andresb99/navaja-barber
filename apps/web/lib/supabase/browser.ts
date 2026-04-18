import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import { getPlatformHostConfig } from '@/lib/platform-host-config';

function getAuthCookieDomain(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const { rootDomain } = getPlatformHostConfig();
  
  // Use the centralized root domain (e.g. .beardly.uy) to share cookies across subdomains.
  // We skip this for localhost as domain=.localhost is invalid in many browsers.
  if (rootDomain && rootDomain !== 'localhost') {
    return `.${rootDomain}`;
  }

  return undefined;
}

export function createSupabaseBrowserClient() {
  const domain = getAuthCookieDomain();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookieOptions: domain ? { domain } : {},
  });
}

