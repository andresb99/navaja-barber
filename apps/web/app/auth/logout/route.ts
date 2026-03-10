import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { resolveSafeNextPath } from '@/lib/navigation';
import { getRequestOrigin } from '@/lib/request-origin';
import { sanitizeText } from '@/lib/sanitize';

type CookiePatch = { name: string; value: string; options?: CookieOptions };

export async function GET(request: NextRequest) {
  const redirectPath = resolveSafeNextPath(
    sanitizeText(request.nextUrl.searchParams.get('next')),
    '/shops',
  );
  const response = NextResponse.redirect(new URL(redirectPath, getRequestOrigin(request)));
  response.headers.set('Cache-Control', 'no-store');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookiePatch[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  await supabase.auth.signOut();
  return response;
}
