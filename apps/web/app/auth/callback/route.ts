import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { resolveSafeNextPath } from '@/lib/navigation';

type CookiePatch = { name: string; value: string; options?: CookieOptions };

function redirectToLogin(request: NextRequest, message: string, next?: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('message', message);

  if (next && next !== '/cuenta' && !next.startsWith('/login')) {
    loginUrl.searchParams.set('next', next);
  }

  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = resolveSafeNextPath(requestUrl.searchParams.get('next'), '/cuenta');
  const providerError = requestUrl.searchParams.get('error_description');

  const response = NextResponse.redirect(new URL(next, request.url));

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

