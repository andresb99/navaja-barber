import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getAccessibleWorkspacesForCurrentUser,
  getFavoriteWorkspaceForCurrentUser,
  type WorkspaceSummary,
} from '@/lib/workspaces';
import { buildAdminHref, buildStaffHref } from '@/lib/workspace-routes';
import { Container } from '@/components/heroui/container';

function getWorkspaceLandingPath(workspace: WorkspaceSummary) {
  return workspace.accessRole === 'staff'
    ? buildStaffHref('/staff', workspace.shopSlug)
    : buildAdminHref('/admin', workspace.shopSlug);
}

const capabilityGroups = [
  {
    title: 'Reservas y pagos',
    points: [
      'Checkout online o pago en local en el mismo flujo.',
      'Disponibilidad real por barbero, horario laboral y bloqueos.',
      'Reembolsos cuando el local cancela una cita pagada.',
    ],
  },
  {
    title: 'Operacion diaria',
    points: [
      'Agenda por staff, estados de cita y seguimiento de no-shows.',
      'Panel admin con metricas, ausencias y notificaciones del equipo.',
      'Paridad web y mobile para manejar barberias activas.',
    ],
  },
  {
    title: 'Crecimiento',
    points: [
      'Marketplace publico, perfiles de local y reseñas verificadas.',
      'Bolsa de trabajo, cursos y convocatorias de modelos.',
      'Contenido indexable para captar reservas y nuevos clientes.',
    ],
  },
] as const;

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
      <Container variant="hero" className="px-6 py-8 md:px-8 md:py-10">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Software para barberias</p>
            <h1 className="mt-3 max-w-4xl font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-ink md:text-[3.3rem] dark:text-slate-100">
              Agenda, pagos, staff y crecimiento en una sola plataforma para barberias.
            </h1>
            <p className="mt-4 max-w-3xl text-base text-slate/80 dark:text-slate-300">
              Beardly unifica reservas online, checkout, operacion diaria, cursos, marketplace y
              seguimiento del negocio sin depender de planillas ni mensajes sueltos.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/software-para-barberias"
                className="action-primary inline-flex rounded-full px-5 py-3 text-sm font-semibold"
              >
                Ver la plataforma
              </Link>
              <Link
                href="/shops"
                className="action-secondary inline-flex rounded-full px-5 py-3 text-sm font-semibold"
              >
                Explorar marketplace
              </Link>
              <Link
                href="/agenda-para-barberos"
                className="action-secondary inline-flex rounded-full px-5 py-3 text-sm font-semibold"
              >
                Ver agenda para barberos
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Flujo publico
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Reservas con pago online o en local
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Multi workspace
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Admin y staff operando desde web y mobile
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Growth
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Marketplace, cursos y bolsa de trabajo
              </p>
            </div>
          </div>
        </div>
      </Container>

      <div className="grid gap-4 lg:grid-cols-3">
        {capabilityGroups.map((group) => (
          <div key={group.title} className="soft-panel rounded-[1.8rem] p-5">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
              {group.title}
            </h2>
            <div className="mt-4 space-y-3">
              {group.points.map((point) => (
                <p key={point} className="surface-card text-sm text-slate/85 dark:text-slate-300">
                  {point}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="soft-panel rounded-[1.8rem] p-5">
          <p className="hero-eyebrow">Pensado para el dia a dia</p>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-slate-100">
            Menos huecos en agenda. Menos friccion en cobros. Mas control operativo.
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="surface-card">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">Antes de la cita</p>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Captacion desde marketplace, disponibilidad real, checkout y validacion final del
                horario antes de cerrar la reserva.
              </p>
            </div>
            <div className="surface-card">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">
                Durante la operacion
              </p>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Staff, bloqueos, ausencias, estados de cita, payment status y vista clara de lo que
                queda pendiente.
              </p>
            </div>
            <div className="surface-card">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">
                Despues de la cita
              </p>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Reseñas, metricas, reembolsos cuando corresponde y mas visibilidad sobre conversion
                y cancelaciones.
              </p>
            </div>
            <div className="surface-card">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">Expansion</p>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Cursos, convocatorias de modelos y postulaciones para hacer crecer la barberia desde
                la misma base de datos operativa.
              </p>
            </div>
          </div>
        </div>

        <div className="soft-panel rounded-[1.8rem] p-5">
          <p className="hero-eyebrow">Rutas clave</p>
          <div className="mt-4 space-y-3">
            <Link href="/software-para-barberias" className="surface-card block no-underline">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">
                Software para barberias
              </p>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Explica agenda, staff, operaciones, pagos y crecimiento con enfoque B2B.
              </p>
            </Link>
            <Link href="/agenda-para-barberos" className="surface-card block no-underline">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">
                Agenda para barberos
              </p>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Landing enfocada en disponibilidad, ocupacion, performance y trabajo diario del
                equipo.
              </p>
            </Link>
            <Link href="/shops" className="surface-card block no-underline">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">
                Marketplace de barberias
              </p>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Descubre locales activos, perfiles publicos y reservas online por tenant.
              </p>
            </Link>
            <Link href="/suscripcion" className="surface-card block no-underline">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">Planes</p>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                Revisa cobros, upgrades y despliegue comercial de la plataforma.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
