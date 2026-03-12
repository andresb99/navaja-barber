import { redirect } from 'next/navigation';
import {
  publicMarketingHomeCapabilityGroups,
  publicMarketingHomeHero,
  publicMarketingHomeKeyRoutes,
  publicMarketingHomeOperationalStages,
} from '@navaja/shared';
import { MarketingHero, MarketingPanel, MarketingSurfaceCard } from '@/components/public/marketing';
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
    <section className="space-y-8 pb-10">
      <MarketingHero
        eyebrow={publicMarketingHomeHero.eyebrow}
        title={publicMarketingHomeHero.title}
        description={publicMarketingHomeHero.description}
        actions={publicMarketingHomeHero.actions}
        stats={publicMarketingHomeHero.stats}
        containerClassName="px-6 py-8 md:px-8 md:py-10"
        layoutClassName="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end"
        titleClassName="mt-3 max-w-4xl font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-ink md:text-[3.3rem] dark:text-slate-100"
        descriptionClassName="mt-4 max-w-3xl text-base text-slate/80 dark:text-slate-300"
        statsClassName="grid gap-3 sm:grid-cols-3 lg:grid-cols-1"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {publicMarketingHomeCapabilityGroups.map((group) => (
          <MarketingPanel key={group.title} title={group.title}>
            <div className="space-y-3">
              {group.points.map((point) => (
                <MarketingSurfaceCard
                  key={point}
                  description={point}
                  descriptionClassName="text-sm text-slate/85 dark:text-slate-300"
                />
              ))}
            </div>
          </MarketingPanel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <MarketingPanel
          eyebrow="Pensado para el dia a dia"
          title="Menos huecos en agenda. Menos friccion en cobros. Mas control operativo."
          titleClassName="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-slate-100"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {publicMarketingHomeOperationalStages.map((stage) => (
              <MarketingSurfaceCard
                key={stage.title}
                title={stage.title}
                description={stage.description}
              />
            ))}
          </div>
        </MarketingPanel>

        <MarketingPanel eyebrow="Rutas clave">
          <div className="space-y-3">
            {publicMarketingHomeKeyRoutes.map((route) => (
              <MarketingSurfaceCard
                key={route.href}
                href={route.href}
                title={route.title}
                description={route.description}
              />
            ))}
          </div>
        </MarketingPanel>
      </div>
    </section>
  );
}
