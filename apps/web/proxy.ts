// Next.js 16+: use this file as the network proxy (tenant headers + rewrites). Do not add a
// separate `middleware.ts` — the build fails if both exist.
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { applyApiRateLimitHeaders, enforceApiRateLimit } from '@/lib/api-rate-limit';
import { getTenantPublicRewritePath } from '@/lib/custom-domains';
import { getRequestOrigin } from '@/lib/request-origin';
import { resolveTenantFromHost } from '@/lib/tenant-host-resolution';

type CookiePatch = { name: string; value: string; options?: CookieOptions };

function needsSessionForPath(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/cuenta') ||
    pathname.startsWith('/app-admin')
  );
}

async function resolveTenantRequest(request: NextRequest) {
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host ||
    '';

  return resolveTenantFromHost(host);
}

function withTenantHeaders(request: NextRequest, tenant: Awaited<ReturnType<typeof resolveTenantRequest>>) {
  const headers = new Headers(request.headers);

  if (!tenant) {
    headers.delete('x-navaja-tenant-shop-id');
    headers.delete('x-navaja-tenant-shop-slug');
    headers.delete('x-navaja-tenant-mode');
    return headers;
  }

  headers.set('x-navaja-tenant-shop-id', tenant.shopId);
  headers.set('x-navaja-tenant-shop-slug', tenant.shopSlug);
  headers.set('x-navaja-tenant-mode', tenant.mode);

  return headers;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname.startsWith('/api/');
  const apiRateLimit = isApiRequest ? await enforceApiRateLimit(request) : null;

  if (apiRateLimit?.blockedResponse) {
    return apiRateLimit.blockedResponse;
  }

  const needsSession = needsSessionForPath(pathname);
  const tenant = isApiRequest ? null : await resolveTenantRequest(request);
  const requestHeaders = withTenantHeaders(request, tenant);
  const rewritePath =
    tenant && !isApiRequest ? getTenantPublicRewritePath(pathname, tenant.shopSlug) : null;
  const rewriteUrl = rewritePath
    ? (() => {
        const nextUrl = request.nextUrl.clone();
        nextUrl.pathname = rewritePath;
        return nextUrl;
      })()
    : null;

  if (!needsSession) {
    if (rewriteUrl) {
      return applyApiRateLimitHeaders(
        NextResponse.rewrite(rewriteUrl, {
          request: {
            headers: requestHeaders,
          },
        }),
        apiRateLimit?.headers,
      );
    }

    if (tenant || isApiRequest) {
      return applyApiRateLimitHeaders(
        NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        }),
        apiRateLimit?.headers,
      );
    }

    return applyApiRateLimitHeaders(NextResponse.next(), apiRateLimit?.headers);
  }

  const response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: requestHeaders,
        },
      })
    : NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return applyApiRateLimitHeaders(
      NextResponse.redirect(new URL('/login', getRequestOrigin(request))),
      apiRateLimit?.headers,
    );
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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL('/login', getRequestOrigin(request));
    loginUrl.searchParams.set('next', pathname);
    return applyApiRateLimitHeaders(NextResponse.redirect(loginUrl), apiRateLimit?.headers);
  }

  return applyApiRateLimitHeaders(response, apiRateLimit?.headers);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};
