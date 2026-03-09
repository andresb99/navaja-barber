import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export interface ApiRateLimitPolicy {
  key: string;
  limit: number;
  windowSeconds: number;
  message?: string;
}

interface ApiRateLimitPolicyMatcher {
  pattern: RegExp;
  methods?: string[];
  policy: ApiRateLimitPolicy | null;
}

interface ConsumeApiRateLimitRow {
  allowed: boolean;
  limit_value: number;
  remaining: number;
  reset_at: string;
  retry_after_seconds: number;
}

export interface ApiRateLimitOutcome {
  policy: ApiRateLimitPolicy;
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterSeconds: number;
}

const POLICY_MATCHERS: ApiRateLimitPolicyMatcher[] = [
  {
    pattern: /^\/api\/payments\/mercadopago\/webhook$/,
    methods: ['GET', 'POST'],
    policy: {
      key: 'mercadopago_webhook',
      limit: 180,
      windowSeconds: 60,
      message: 'Demasiadas notificaciones de pago en poco tiempo.',
    },
  },
  {
    pattern: /^\/api\/(?:shops\/search|shops\/viewport|availability)$/,
    methods: ['GET'],
    policy: {
      key: 'marketplace_lookup',
      limit: 90,
      windowSeconds: 60,
      message: 'Demasiadas consultas seguidas. Intenta nuevamente en un minuto.',
    },
  },
  {
    pattern: /^\/api\/review\/preview$/,
    methods: ['GET'],
    policy: {
      key: 'review_preview',
      limit: 45,
      windowSeconds: 60,
      message: 'Demasiadas consultas de resena. Espera un momento antes de reintentar.',
    },
  },
  {
    pattern: /^\/api\/(?:bookings|courses\/enroll|jobs\/apply|jobs\/network|modelos\/registro|review\/submit)$/,
    methods: ['POST'],
    policy: {
      key: 'public_form_submit',
      limit: 12,
      windowSeconds: 600,
      message: 'Demasiados envios en poco tiempo. Espera unos minutos antes de volver a intentar.',
    },
  },
  {
    pattern: /^\/api\/subscriptions\/checkout$/,
    methods: ['POST'],
    policy: {
      key: 'subscription_checkout',
      limit: 10,
      windowSeconds: 600,
      message: 'Demasiados intentos de checkout. Espera unos minutos antes de reintentar.',
    },
  },
  {
    pattern: /^\/api\/onboarding\/barbershop$/,
    methods: ['POST'],
    policy: {
      key: 'barbershop_onboarding',
      limit: 6,
      windowSeconds: 3600,
      message: 'Demasiados intentos de onboarding. Vuelve a intentar mas tarde.',
    },
  },
  {
    pattern: /^\/api\/(?:account\/appointments|account\/reviews|account\/invitations\/respond|admin\/barbershop|admin\/custom-domain)$/,
    policy: {
      key: 'authenticated_api',
      limit: 120,
      windowSeconds: 60,
      message: 'Demasiadas solicitudes internas en poco tiempo. Intenta nuevamente en breve.',
    },
  },
  {
    pattern: /^\/api\//,
    policy: {
      key: 'api_default',
      limit: 120,
      windowSeconds: 60,
      message: 'Demasiadas solicitudes. Intenta nuevamente en breve.',
    },
  },
];

function matchesMethod(methods: string[] | undefined, method: string) {
  if (!methods?.length) {
    return true;
  }

  return methods.includes(method.toUpperCase());
}

export function resolveApiRateLimitPolicy(
  pathname: string,
  method: string,
): ApiRateLimitPolicy | null {
  const normalizedPathname = String(pathname || '').trim();
  const normalizedMethod = String(method || 'GET').trim().toUpperCase();

  if (!normalizedPathname.startsWith('/api/')) {
    return null;
  }

  for (const matcher of POLICY_MATCHERS) {
    if (!matcher.pattern.test(normalizedPathname)) {
      continue;
    }

    if (!matchesMethod(matcher.methods, normalizedMethod)) {
      continue;
    }

    return matcher.policy;
  }

  return null;
}

export function getApiRateLimitSubject(request: Pick<NextRequest, 'headers' | 'nextUrl'>) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  const localIp = request.headers.get('x-vercel-forwarded-for');
  const candidate =
    forwardedFor?.split(',')[0]?.trim() ||
    realIp?.trim() ||
    cfIp?.trim() ||
    localIp?.split(',')[0]?.trim() ||
    '';

  if (candidate) {
    return candidate;
  }

  const hostname = request.nextUrl.hostname?.trim() || 'unknown-host';
  const userAgent = request.headers.get('user-agent')?.trim() || 'unknown-agent';
  return `${hostname}:${userAgent.slice(0, 120)}`;
}

function createApiRateLimitHeaders(outcome: ApiRateLimitOutcome) {
  const headers = new Headers();
  const resetAtMs = Date.parse(outcome.resetAt);
  const resetAtSeconds = Number.isFinite(resetAtMs) ? Math.ceil(resetAtMs / 1000) : 0;

  headers.set('X-RateLimit-Limit', String(outcome.limit));
  headers.set('X-RateLimit-Remaining', String(Math.max(outcome.remaining, 0)));
  headers.set('X-RateLimit-Reset', String(resetAtSeconds));
  headers.set('X-RateLimit-Policy', `${outcome.policy.limit};w=${outcome.policy.windowSeconds}`);

  if (!outcome.allowed) {
    headers.set('Retry-After', String(Math.max(outcome.retryAfterSeconds, 1)));
  }

  return headers;
}

async function consumeApiRateLimit(policy: ApiRateLimitPolicy, subject: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.rpc('consume_api_rate_limit', {
    p_bucket_name: policy.key,
    p_subject: subject,
    p_limit: policy.limit,
    p_window_seconds: policy.windowSeconds,
  });

  if (error || !Array.isArray(data) || !data[0]) {
    return null;
  }

  const row = data[0] as ConsumeApiRateLimitRow;

  return {
    policy,
    allowed: Boolean(row.allowed),
    limit: Number(row.limit_value || policy.limit),
    remaining: Math.max(0, Number(row.remaining || 0)),
    resetAt: String(row.reset_at),
    retryAfterSeconds: Math.max(0, Number(row.retry_after_seconds || 0)),
  } satisfies ApiRateLimitOutcome;
}

export async function enforceApiRateLimit(request: NextRequest) {
  const policy = resolveApiRateLimitPolicy(request.nextUrl.pathname, request.method);
  if (!policy) {
    return null;
  }

  const subject = getApiRateLimitSubject(request);
  const outcome = await consumeApiRateLimit(policy, subject);

  if (!outcome) {
    return null;
  }

  const headers = createApiRateLimitHeaders(outcome);

  if (outcome.allowed) {
    return {
      blockedResponse: null,
      headers,
      outcome,
    };
  }

  return {
    blockedResponse: NextResponse.json(
      {
        error: policy.message || 'Demasiadas solicitudes. Intenta nuevamente en breve.',
        code: 'rate_limit_exceeded',
      },
      {
        status: 429,
        headers,
      },
    ),
    headers,
    outcome,
  };
}

export function applyApiRateLimitHeaders(
  response: NextResponse,
  rateLimitHeaders: Headers | null | undefined,
) {
  if (!rateLimitHeaders) {
    return response;
  }

  rateLimitHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}
