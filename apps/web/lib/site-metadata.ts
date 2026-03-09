import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/constants';
import { getPlatformAppUrl } from '@/lib/platform-host-config';

export const DEFAULT_SITE_DESCRIPTION =
  'Marketplace y plataforma para barberias: reservas, cursos, postulaciones y gestion operativa en un solo lugar.';

function getNormalizedAppUrl() {
  const appUrl = getPlatformAppUrl();
  if (!appUrl) {
    return null;
  }

  try {
    return new URL(appUrl);
  } catch {
    return null;
  }
}

export function getSiteMetadataBase() {
  return getNormalizedAppUrl() ?? undefined;
}

export function buildAbsoluteSiteUrl(pathname: string) {
  const appUrl = getNormalizedAppUrl();
  if (!appUrl) {
    return null;
  }

  try {
    return new URL(pathname, appUrl).toString();
  } catch {
    return null;
  }
}

interface BasePageMetadataOptions {
  title: string;
  description: string;
  canonical?: string | null;
  noIndex?: boolean;
  follow?: boolean;
  openGraphType?: 'website' | 'article';
}

export function buildBasePageMetadata(options: BasePageMetadataOptions): Metadata {
  const canonical = String(options.canonical || '').trim() || null;

  return {
    title: options.title,
    description: options.description,
    ...(canonical
      ? {
          alternates: {
            canonical,
          },
        }
      : {}),
    openGraph: {
      title: options.title,
      description: options.description,
      siteName: APP_NAME,
      locale: 'es_UY',
      type: options.openGraphType || 'website',
      ...(canonical ? { url: canonical } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: options.title,
      description: options.description,
    },
    ...(options.noIndex
      ? {
          robots: {
            index: false,
            follow: options.follow ?? true,
          },
        }
      : {}),
  };
}

interface SitePageMetadataOptions {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  follow?: boolean;
}

export function buildSitePageMetadata(options: SitePageMetadataOptions): Metadata {
  return buildBasePageMetadata({
    title: options.title,
    description: options.description,
    canonical: options.path ? buildAbsoluteSiteUrl(options.path) : null,
    ...(typeof options.noIndex === 'boolean' ? { noIndex: options.noIndex } : {}),
    ...(typeof options.follow === 'boolean' ? { follow: options.follow } : {}),
  });
}

export function buildRootMetadata(): Metadata {
  return {
    metadataBase: getSiteMetadataBase(),
    title: {
      default: APP_NAME,
      template: `%s | ${APP_NAME}`,
    },
    applicationName: APP_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    openGraph: {
      title: APP_NAME,
      description: DEFAULT_SITE_DESCRIPTION,
      siteName: APP_NAME,
      locale: 'es_UY',
      type: 'website',
      ...(buildAbsoluteSiteUrl('/shops') ? { url: buildAbsoluteSiteUrl('/shops') || undefined } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: APP_NAME,
      description: DEFAULT_SITE_DESCRIPTION,
    },
    icons: {
      icon: '/favicon-beardly.png',
      shortcut: '/favicon-beardly.png',
      apple: '/favicon-beardly.png',
    },
  };
}

export function buildGlobalStructuredData() {
  const siteUrl = buildAbsoluteSiteUrl('/');
  if (!siteUrl) {
    return [];
  }

  const logoUrl = buildAbsoluteSiteUrl('/beardly-logo.png');

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: APP_NAME,
      url: siteUrl,
      ...(logoUrl ? { logo: logoUrl } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: APP_NAME,
      url: siteUrl,
      inLanguage: 'es-UY',
      description: DEFAULT_SITE_DESCRIPTION,
    },
  ];
}

export const PRIVATE_SECTION_METADATA = {
  robots: {
    index: false,
    follow: false,
  },
} satisfies Metadata;
