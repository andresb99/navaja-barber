import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { resolveSafeNextPath } from '@/lib/navigation';
import { getRequestOrigin } from '@/lib/request-origin';
import { sanitizeText } from '@/lib/sanitize';

type CookiePatch = { name: string; value: string; options?: CookieOptions };

function redirectToLogin(request: NextRequest, message: string, next?: string) {
  const loginUrl = new URL('/login', getRequestOrigin(request));
  loginUrl.searchParams.set('message', message);

  if (next && next !== '/' && !next.startsWith('/login')) {
    loginUrl.searchParams.set('next', next);
  }

  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = sanitizeText(requestUrl.searchParams.get('code'));
  const next = resolveSafeNextPath(sanitizeText(requestUrl.searchParams.get('next')), '/');
  const providerError = sanitizeText(requestUrl.searchParams.get('error_description'));
  const publicOrigin = getRequestOrigin(request);

  const response = NextResponse.redirect(new URL(next, publicOrigin));

  if (providerError) {
    return redirectToLogin(request, providerError, next);
  }

  if (!code) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return redirectToLogin(request, 'Configuracion incompleta de autenticacion.', next);
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectToLogin(request, error.message, next);
  }

  return response;
}

