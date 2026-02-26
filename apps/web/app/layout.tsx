import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Sora } from 'next/font/google';
import { navajaTheme } from '@navaja/shared';
import './globals.css';
import { APP_NAME } from '@/lib/constants';
import { OrbBackdrop } from '@/components/public/orb-backdrop';
import { SiteHeader } from '@/components/public/site-header';

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

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Reservas, operacion del equipo, cursos y postulaciones en una sola plataforma.',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-UY"
      className={`${headingFont.variable} ${bodyFont.variable}`}
      style={rootThemeVars}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-[#f6f8ff] text-slate-900 antialiased font-[family-name:var(--font-body)] dark:bg-[#060012] dark:text-slate-100">
        <OrbBackdrop />
        <SiteHeader />

        <main className="page-enter relative z-10 mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
