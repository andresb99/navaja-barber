import NextLink from 'next/link';
import { redirect } from 'next/navigation';
import { Link } from '@heroui/link';
import {
  getAccessibleWorkspacesForCurrentUser,
  getFavoriteWorkspaceForCurrentUser,
  type WorkspaceSummary,
} from '@/lib/workspaces';
import { buildAdminHref, buildStaffHref } from '@/lib/workspace-routes';

function getWorkspaceLandingPath(workspace: WorkspaceSummary) {
  return workspace.accessRole === 'staff'
    ? buildStaffHref('/staff', workspace.shopSlug)
    : buildAdminHref('/admin', workspace.shopSlug);
}

export default async function HomePage() {
  const catalog = await getAccessibleWorkspacesForCurrentUser();

  if (catalog) {
    const workspaces = catalog.workspaces || [];

    if (!workspaces.length) {
      redirect('/mis-barberias');
    }

    if (workspaces.length === 1) {
      const firstWorkspace = workspaces[0];
      if (firstWorkspace) {
        redirect(getWorkspaceLandingPath(firstWorkspace));
      }
    }

    const favoriteWorkspace = await getFavoriteWorkspaceForCurrentUser();
    if (favoriteWorkspace) {
      redirect(getWorkspaceLandingPath(favoriteWorkspace));
    }

    redirect('/mis-barberias');
  }

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden px-6 pb-36">
      {/* Background aura */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/8 blur-[140px] dark:bg-violet-500/6" />
        <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-purple-400/6 blur-[100px] dark:bg-purple-400/5" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-brass/4 blur-[80px] dark:bg-brass/3" />
      </div>

      <div className="relative z-10 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate/50 dark:text-white/55">
          Beardly · Uruguay
        </p>

        <h1 className="mt-5 font-[family-name:var(--font-heading)] text-5xl font-bold tracking-tight text-ink md:text-6xl lg:text-[4.5rem] dark:text-slate-100">
          Encuentra tu
          <br />
          barbería.
        </h1>

        <p className="mx-auto mt-5 max-w-sm text-base text-slate/50 dark:text-white/60">
          Barberias verificadas con reservas online, reseñas reales y horarios actualizados.
        </p>

        <div className="mt-8">
          <NextLink
            href="/shops"
            className="action-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-semibold"
          >
            Ver barberias en el mapa
            <span aria-hidden="true">→</span>
          </NextLink>
        </div>

        <p className="mt-6 text-xs text-slate/50 dark:text-white/55">
          ¿Tienes una barbería?{' '}
          <Link
            href="/software-para-barberias"
            underline="always"
            className="!text-xs text-slate/50 transition-colors hover:text-slate/80 dark:text-white/55 dark:hover:text-white/80"
          >
            Conoce la plataforma
          </Link>
        </p>
      </div>
    </div>
  );
}
