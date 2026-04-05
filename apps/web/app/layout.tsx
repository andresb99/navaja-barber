import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Sora } from 'next/font/google';
import { navajaTheme } from '@navaja/shared';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import { SiteHeaderServer } from '@/components/public/site-header-server';
import { HeroUiProvider } from '@/components/providers/heroui-provider';
import { buildGlobalStructuredData, buildRootMetadata } from '@/lib/site-metadata';

const headingFont = Sora({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

const themeScript = `
  (() => {
    try {
      const storedTheme = localStorage.getItem('navaja-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;
      document.documentElement.classList.toggle('dark', shouldUseDark);
    } catch {}
  })();
`;

export const metadata: Metadata = buildRootMetadata();
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const rootThemeVars = {
  '--ink': navajaTheme.rgb.ink,
  '--cream': navajaTheme.rgb.cream,
  '--brass': navajaTheme.rgb.brass,
  '--slate': navajaTheme.rgb.slate,
  '--surface': navajaTheme.rgb.surface,
  '--surface-muted': navajaTheme.rgb.surfaceMuted,
  '--focus-light': navajaTheme.rgb.focusLight,
  '--focus-dark': navajaTheme.rgb.focusDark,
} as React.CSSProperties;

function SiteHeaderFallback() {
  return (
    <div className="px-0 pt-0" aria-hidden="true">
      <div className="glass-nav mx-auto h-[72px] w-full max-w-none px-4 md:px-6 lg:px-8" />
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = buildGlobalStructuredData();

  return (
    <html
      lang="es-UY"
      className={`${headingFont.variable} ${bodyFont.variable}`}
      style={rootThemeVars}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {structuredData.length > 0 ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        ) : null}
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-page-bg text-slate-900 antialiased font-[family-name:var(--font-body)] dark:text-zinc-50">
        <HeroUiProvider>
          <div className="relative min-h-screen">
            <Suspense fallback={<SiteHeaderFallback />}>
              <SiteHeaderServer />
            </Suspense>

            <main className="main-shell page-enter">{children}</main>
          </div>
        </HeroUiProvider>
      </body>
    </html>
  );
}
