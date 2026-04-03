import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { getPlatformHostConfig } from '@/lib/platform-host-config';

type CookiePatch = { name: string; value: string; options?: CookieOptions };

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { rootDomain } = getPlatformHostConfig();
  const cookieDomain = rootDomain ? `.${rootDomain}` : undefined;

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookiePatch[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...(options as CookieOptions),
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            });
          });
        } catch {
          // No-op in server components where cookies are read-only.
        }
      },
    },
  });
}

