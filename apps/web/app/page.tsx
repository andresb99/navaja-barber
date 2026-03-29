import { headers } from 'next/headers';
import NextLink from 'next/link';
import { redirect } from 'next/navigation';
import { Link } from '@heroui/link';
import { getRequestOriginFromHeaders } from '@/lib/request-origin';
import {
  getAccessibleWorkspacesForCurrentUser,
  getFavoriteWorkspaceForCurrentUser,
  type WorkspaceSummary,
} from '@/lib/workspaces';
import { buildTenantAdminHref, buildTenantStaffHref } from '@/lib/workspace-routes';

function getWorkspaceLandingPath(workspace: WorkspaceSummary, requestOrigin: string | null) {
  return workspace.accessRole === 'staff'
    ? buildTenantStaffHref('/staff', workspace.shopSlug, undefined, { requestOrigin })
    : buildTenantAdminHref('/admin', workspace.shopSlug, undefined, { requestOrigin });
}

export default async function HomePage() {
  const requestOrigin = getRequestOriginFromHeaders(await headers());
  const catalog = await getAccessibleWorkspacesForCurrentUser();

  if (catalog) {
    const workspaces = catalog.workspaces || [];

    if (!workspaces.length) {
      redirect('/mis-barberias');
    }

    if (workspaces.length === 1) {
      const firstWorkspace = workspaces[0];
      if (firstWorkspace) {
        redirect(getWorkspaceLandingPath(firstWorkspace, requestOrigin));
      }
    }

    const favoriteWorkspace = await getFavoriteWorkspaceForCurrentUser();
    if (favoriteWorkspace) {
      redirect(getWorkspaceLandingPath(favoriteWorkspace, requestOrigin));
    }

    redirect('/mis-barberias');
  }

  return (
    <div className="relative flex min-h-[calc(100vh-176px)] flex-col items-center justify-center overflow-hidden px-4 md:px-6 w-full">
      <div className="relative z-10 w-full max-w-4xl text-center">
        {/* Modern Badge */}
        <div className="mx-auto mb-6 md:mb-8 inline-flex max-w-full items-center justify-center rounded-full border border-black/5 bg-black/[0.03] px-3 py-1.5 md:px-4 md:py-1.5 text-[11px] md:text-xs font-semibold tracking-wide text-ink/70 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
          <span className="mr-2 flex h-1.5 w-1.5 md:h-2 md:w-2 shrink-0 rounded-full bg-violet-500 opacity-90"></span>
          <span className="truncate">Marketplace de barberías · Uruguay</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] font-extrabold tracking-[-0.03em] leading-tight text-ink lg:leading-[1.05] dark:bg-gradient-to-b dark:from-white dark:to-zinc-500 dark:bg-clip-text dark:text-transparent">
          Encuentra tu
          <br />
          barbería.
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-4 md:mt-6 max-w-[28rem] px-2 text-sm md:text-base font-medium leading-relaxed text-slate/70 dark:text-zinc-400">
          Barberías verificadas con reservas online, reseñas reales y horarios actualizados.
        </p>

        {/* CTA Section */}
        <div className="mt-8 md:mt-10 flex w-full flex-col items-center justify-center gap-4 sm:flex-row px-4">
          <NextLink
            href="/shops"
            className="group relative inline-flex w-full sm:w-auto min-h-[52px] items-center justify-center gap-2 overflow-hidden rounded-full bg-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)] transition-all hover:bg-violet-500 hover:shadow-[0_0_60px_-15px_rgba(139,92,246,0.5)] active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)] dark:hover:bg-white dark:hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.2)]"
          >
            Ver barberías en el mapa
            <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </NextLink>
        </div>

        {/* Footer Link */}
        <p className="mt-8 text-[13px] font-medium text-slate/50 dark:text-zinc-500">
          ¿Tienes una barbería?{' '}
          <Link
            href="/software-para-barberias"
            underline="always"
            className="!text-[13px] font-bold text-slate/70 transition-colors hover:text-ink dark:text-zinc-300 dark:hover:text-white"
          >
            Conoce la plataforma
          </Link>
        </p>
      </div>

      {/* Social Proof / Stats Section - Ultra Minimalist */}
      <div 
        className="page-enter relative z-10 mt-16 md:mt-24 grid w-full max-w-4xl grid-cols-2 gap-y-10 px-4 sm:px-6 md:grid-cols-4 md:gap-y-0 md:divide-x md:divide-slate-200 md:dark:divide-white/5"
        style={{ animationDelay: '150ms' }}
      >
        {/* Stat 1 */}
        <div className="flex flex-col items-center justify-center transition-transform duration-500 hover:-translate-y-1">
          <span className="text-4xl font-medium tracking-tight text-ink dark:text-zinc-100 md:text-5xl">500+</span>
          <span className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate/50 dark:text-zinc-500 md:text-[11px]">Barberías</span>
        </div>

        {/* Stat 2 */}
        <div className="flex flex-col items-center justify-center transition-transform duration-500 hover:-translate-y-1">
          <span className="text-4xl font-medium tracking-tight text-ink dark:text-zinc-100 md:text-5xl">100K</span>
          <span className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate/50 dark:text-zinc-500 md:text-[11px]">Reservas</span>
        </div>

        {/* Stat 3 */}
        <div className="flex flex-col items-center justify-center transition-transform duration-500 hover:-translate-y-1">
          <span className="text-4xl font-medium tracking-tight text-ink dark:text-zinc-100 md:text-5xl">1.2K</span>
          <span className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate/50 dark:text-zinc-500 md:text-[11px]">Barberos</span>
        </div>

        {/* Stat 4 */}
        <div className="flex flex-col items-center justify-center transition-transform duration-500 hover:-translate-y-1">
          <span className="text-4xl font-medium tracking-tight text-ink dark:text-zinc-100 md:text-5xl">4.9</span>
          <span className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate/50 dark:text-zinc-500 md:text-[11px]">Calificación</span>
        </div>
      </div>
    </div>
  );
}
