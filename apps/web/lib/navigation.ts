const allowedNextRoots = ['/admin', '/staff', '/cuenta', '/book', '/courses', '/modelos', '/jobs', '/login'] as const;

function isAllowedPath(pathname: string) {
  if (pathname === '/') {
    return true;
  }

  return allowedNextRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export function resolveSafeNextPath(input: string | null | undefined, fallback = '/cuenta') {
  if (!input || !input.startsWith('/') || input.startsWith('//')) {
    return fallback;
  }

  try {
    const parsed = new URL(input, 'https://navaja.local');
    const resolved = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (parsed.origin !== 'https://navaja.local') {
      return fallback;
    }

    if (!isAllowedPath(parsed.pathname)) {
      return fallback;
    }

    return resolved;
  } catch {
    return fallback;
  }
}
