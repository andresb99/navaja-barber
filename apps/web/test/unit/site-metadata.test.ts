import {
  buildGlobalStructuredData,
  buildRootMetadata,
  buildSitePageMetadata,
} from '@/lib/site-metadata';

describe('site metadata helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds absolute canonical metadata for public pages', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beardly.com');

    const metadata = buildSitePageMetadata({
      title: 'Marketplace',
      description: 'Directorio de barberias',
      path: '/shops',
    });

    expect(metadata.alternates?.canonical).toBe('https://beardly.com/shops');
    expect(metadata.openGraph).toMatchObject({
      url: 'https://beardly.com/shops',
      locale: 'es_UY',
      type: 'website',
      siteName: 'Beardly',
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Marketplace',
    });
  });

  it('marks noindex pages and exposes global structured data', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://beardly.com');

    const metadata = buildSitePageMetadata({
      title: 'Login',
      description: 'Acceso privado',
      path: '/login',
      noIndex: true,
      follow: false,
    });
    const rootMetadata = buildRootMetadata();
    const structuredData = buildGlobalStructuredData();

    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
    });
    expect(rootMetadata.metadataBase?.toString()).toBe('https://beardly.com/');
    expect(structuredData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          '@type': 'Organization',
          name: 'Beardly',
          url: 'https://beardly.com/',
        }),
        expect.objectContaining({
          '@type': 'WebSite',
          url: 'https://beardly.com/',
        }),
      ]),
    );
  });
});
