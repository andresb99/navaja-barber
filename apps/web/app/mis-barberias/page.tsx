import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  WorkspaceFavoriteProvider,
  WorkspaceFavoriteToggle,
} from '@/components/workspace-favorite-toggle';
import { requireAuthenticated } from '@/lib/auth';
import { getRequestOriginFromHeaders } from '@/lib/request-origin';
import { buildTenantCanonicalHref } from '@/lib/tenant-public-urls';
import { buildTenantAdminHref, buildTenantStaffHref } from '@/lib/workspace-routes';
import {
  getAccessibleWorkspacesForCurrentUser,
  getFavoriteWorkspaceForCurrentUser,
  getSelectedWorkspaceForCurrentUser,
} from '@/lib/workspaces';
import { Container } from '@/components/heroui/container';

interface MyBarbershopsPageProps {
  searchParams: Promise<{ error?: string }>;
}

const accessRoleLabel = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
} as const;

const shopStatusLabel = {
  draft: 'Borrador',
  setup_in_progress: 'Configurando',
  active: 'Activa',
  suspended: 'Suspendida',
} as const;

function getWorkspacePrimaryHref(
  shopSlug: string,
  accessRole: keyof typeof accessRoleLabel,
  requestOrigin: string | null,
) {
  return accessRole === 'staff'
    ? buildTenantStaffHref('/staff', shopSlug, undefined, { requestOrigin })
    : buildTenantAdminHref('/admin', shopSlug, undefined, { requestOrigin });
}

function getWorkspacePrimaryLabel(accessRole: keyof typeof accessRoleLabel) {
  return accessRole === 'staff' ? 'Abrir panel staff' : 'Abrir panel admin';
}

export default async function MyBarbershopsPage({ searchParams }: MyBarbershopsPageProps) {
  const requestOrigin = getRequestOriginFromHeaders(await headers());
  await requireAuthenticated('/mis-barberias');
  const [{ error }, catalog, selectedWorkspace, favoriteWorkspace] = await Promise.all([
    searchParams,
    getAccessibleWorkspacesForCurrentUser(),
    getSelectedWorkspaceForCurrentUser(),
    getFavoriteWorkspaceForCurrentUser(),
  ]);

  const workspaces = catalog?.workspaces || [];
  const singleWorkspace = workspaces.length === 1 ? workspaces[0] : null;
  if (singleWorkspace) {
    redirect(getWorkspacePrimaryHref(singleWorkspace.shopSlug, singleWorkspace.accessRole, requestOrigin));
  }

  return (
    <section className="space-y-6">
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Mis barberias</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Seleccion de workspace
            </h1>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              Elige la barberia que quieres gestionar. El panel conserva esa seleccion en la URL y
              solo opera sobre ese workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Accesos
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {workspaces.length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Workspace activo
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                {selectedWorkspace?.shopName || 'Sin seleccionar'}
              </p>
            </div>
          </div>
        </div>
      </Container>

      {error ? <p className="status-banner error">{error}</p> : null}

      {workspaces.length === 0 ? (
        <Card className="rounded-[1.6rem] border border-slate-900/10 bg-white/80 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/[0.03]">
          <CardBody className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Inicio rapido
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-zinc-100">
                Aun no tienes barberias vinculadas
              </h2>
            </div>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Crea tu primera barberia o espera una invitacion de un owner para entrar como staff.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                as="a"
                href="/onboarding/barbershop"
                color="primary"
                size="sm"
                className="px-4 text-sm font-semibold"
              >
                Crear barberia
              </Button>
              <Button
                as="a"
                href="/shops"
                variant="flat"
                size="sm"
                className="px-4 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Volver al marketplace
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <WorkspaceFavoriteProvider initialFavoriteShopId={favoriteWorkspace?.shopId || null}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => {
              const isActive = selectedWorkspace?.shopId === workspace.shopId;
              const statusLabel =
                shopStatusLabel[workspace.shopStatus as keyof typeof shopStatusLabel] ||
                workspace.shopStatus;

              return (
                <Card
                  key={workspace.shopId}
                  className="rounded-[1.6rem] border border-slate-900/10 bg-white/80 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">
                          {workspace.shopSlug}
                        </p>
                        <h2 className="mt-1 truncate text-lg font-semibold text-slate-900 dark:text-zinc-100">
                          {workspace.shopName}
                        </h2>
                      </div>

                      <div className="flex shrink-0 items-start gap-2">
                        <WorkspaceFavoriteToggle
                          shopId={workspace.shopId}
                          shopName={workspace.shopName}
                        />
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {isActive ? (
                            <Chip size="sm" radius="full" variant="flat" color="success">
                              Activa
                            </Chip>
                          ) : null}
                          <Chip size="sm" radius="full" variant="flat" color="default">
                            {accessRoleLabel[workspace.accessRole]}
                          </Chip>
                          <Chip size="sm" radius="full" variant="flat" color="default">
                            {statusLabel}
                          </Chip>
                        </div>
                      </div>
                    </div>

                    <div className="my-3 h-px bg-slate-900/10 dark:bg-white/10" />

                    <dl className="grid gap-2 text-sm">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">
                          Rol
                        </dt>
                        <dd className="text-slate-800 dark:text-zinc-200">
                          {accessRoleLabel[workspace.accessRole]}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">
                          Estado
                        </dt>
                        <dd className="text-slate-800 dark:text-zinc-200">{statusLabel}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">
                          Zona horaria
                        </dt>
                        <dd className="truncate text-slate-700 dark:text-zinc-300">
                          {workspace.shopTimezone}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        as="a"
                        href={getWorkspacePrimaryHref(
                          workspace.shopSlug,
                          workspace.accessRole,
                          requestOrigin,
                        )}
                        color="primary"
                        size="sm"
                        className="px-4 text-sm font-semibold"
                      >
                        {getWorkspacePrimaryLabel(workspace.accessRole)}
                      </Button>

                      {workspace.staffId && workspace.accessRole !== 'staff' ? (
                        <Button
                          as="a"
                          href={buildTenantStaffHref('/staff', workspace.shopSlug, undefined, {
                            requestOrigin,
                          })}
                          variant="flat"
                          size="sm"
                          className="px-4 text-sm font-semibold text-slate-700 dark:text-slate-200"
                        >
                          Ver agenda staff
                        </Button>
                      ) : null}

                      <Button
                        as="a"
                        href={buildTenantCanonicalHref({ slug: workspace.shopSlug }, 'profile')}
                        variant="flat"
                        size="sm"
                        className="px-4 text-sm font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Ver perfil publico
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </WorkspaceFavoriteProvider>
      )}
    </section>
  );
}
