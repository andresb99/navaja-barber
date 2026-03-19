// Builds the full URL to a shop's tenant subdomain (e.g. barbertest.beardly.com).
// Falls back to the platform profile path in local development.
export function buildTenantRootHref(shopSlug: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN ?? '';
  const isLocalhost = rootDomain === 'localhost' || rootDomain === '';
  if (isLocalhost) {
    return `/shops/${normalizeShopSlug(shopSlug)}`;
  }
  return `https://${normalizeShopSlug(shopSlug)}.${rootDomain}`;
}

// Builds an absolute URL to the Beardly platform (used from tenant subdomains).
export function buildPlatformUrl(path = '/'): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  return appUrl ? `${appUrl}${path}` : path;
}

export function normalizeShopSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildShopHref(slug: string, section?: 'book' | 'jobs' | 'courses' | 'modelos') {
  const normalizedSlug = normalizeShopSlug(slug);
  if (!section) return `/shops/${normalizedSlug}`;
  if (section === 'book') return `/book/${normalizedSlug}`;
  if (section === 'modelos') return `/modelos/${normalizedSlug}`;
  if (section === 'jobs') return `/jobs/${normalizedSlug}`;
  // courses listing stays scoped to the shop
  return `/shops/${normalizedSlug}/courses`;
}

export function buildTenantPublicHref(
  shopSlug: string,
  mode: 'path' | 'custom_domain' | 'platform_subdomain',
  section?: 'book' | 'jobs' | 'courses' | 'modelos',
) {
  if (mode === 'custom_domain' || mode === 'platform_subdomain') {
    if (!section) {
      return '/';
    }

    return `/${section}`;
  }

  return buildShopHref(shopSlug, section);
}

export function buildTenantCourseHref(
  shopSlug: string,
  courseId: string,
  mode: 'path' | 'custom_domain' | 'platform_subdomain',
) {
  const normalizedCourseId = String(courseId || '').trim();
  if (!normalizedCourseId) {
    return buildTenantPublicHref(shopSlug, mode, 'courses');
  }

  // Course IDs are globally unique — /courses/[id] works in all modes
  return `/courses/${encodeURIComponent(normalizedCourseId)}`;
}

export function buildTenantModelRegistrationHref(
  shopSlug: string,
  mode: 'path' | 'custom_domain' | 'platform_subdomain',
  sessionId?: string | null,
) {
  const basePath =
    mode === 'custom_domain' || mode === 'platform_subdomain'
      ? '/modelos/registro'
      : `/modelos/${normalizeShopSlug(shopSlug)}/registro`;
  const normalizedSessionId = String(sessionId || '').trim();

  if (!normalizedSessionId) {
    return basePath;
  }

  return `${basePath}?session_id=${encodeURIComponent(normalizedSessionId)}`;
}
