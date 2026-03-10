import { type NextRequest } from 'next/server';

function normalizeHostname(hostname: string) {
  return hostname === '0.0.0.0' ? 'localhost' : hostname;
}

interface HeaderReader {
  get(name: string): string | null;
}

function getFallbackOrigin(value: string | URL | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = typeof value === 'string' ? new URL(value) : new URL(value.toString());
    url.hostname = normalizeHostname(url.hostname);
    return url.origin;
  } catch {
    return null;
  }
}

function getOriginFromHeaders(
  headers: HeaderReader,
  fallbackUrl: string | URL | null | undefined,
) {
  const fallbackOrigin = getFallbackOrigin(fallbackUrl);
  const forwardedProto = headers.get('x-forwarded-proto');
  const forwardedHost = headers.get('x-forwarded-host');
  const host = forwardedHost ?? headers.get('host');

  if (!host) {
    return fallbackOrigin;
  }

  const fallbackHostname = fallbackOrigin ? new URL(fallbackOrigin).hostname : 'localhost';
  const [rawHostname, ...portParts] = host.split(':');
  const normalizedHost = normalizeHostname(rawHostname || fallbackHostname);
  const port = portParts.join(':');
  const fallbackProtocol = fallbackOrigin ? new URL(fallbackOrigin).protocol.replace(':', '') : 'http';
  const protocol = forwardedProto ?? fallbackProtocol;

  return `${protocol}://${normalizedHost}${port ? `:${port}` : ''}`;
}

export function getRequestOrigin(request: NextRequest) {
  const origin = getOriginFromHeaders(request.headers, request.url);
  /* c8 ignore next 4 -- getOriginFromHeaders should always resolve for a valid NextRequest. */
  if (!origin) {
    return new URL(request.url).origin;
  }

  return origin;
}

export function getRequestOriginFromHeaders(
  headers: HeaderReader,
  fallbackUrl?: string | URL | null,
) {
  const resolvedFallbackUrl =
    fallbackUrl === undefined ? process.env.NEXT_PUBLIC_APP_URL || null : fallbackUrl;

  return getOriginFromHeaders(headers, resolvedFallbackUrl);
}
