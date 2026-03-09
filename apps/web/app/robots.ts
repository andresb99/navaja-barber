import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getRequestOriginFromHeaders } from '@/lib/request-origin';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerStore = await headers();
  const requestOrigin = getRequestOriginFromHeaders(headerStore);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/callback', '/auth/logout'],
      },
    ],
    ...(requestOrigin ? { sitemap: `${requestOrigin}/sitemap.xml`, host: new URL(requestOrigin).host } : {}),
  };
}
