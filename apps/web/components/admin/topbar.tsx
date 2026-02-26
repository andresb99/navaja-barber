import Link from 'next/link';
import { signOutAction } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';

export function AdminTopbar() {
  const navLinkClassName =
    'rounded-lg bg-white/65 px-3 py-2 font-medium text-ink no-underline transition-colors hover:bg-white dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-700/80';

  return (
    <div className="soft-panel mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link className={navLinkClassName} href="/admin">
          Resumen
        </Link>
        <Link className={navLinkClassName} href="/admin/appointments">
          Citas
        </Link>
        <Link className={navLinkClassName} href="/admin/staff">
          Equipo
        </Link>
        <Link className={navLinkClassName} href="/admin/services">
          Servicios
        </Link>
        <Link className={navLinkClassName} href="/admin/courses">
          Cursos
        </Link>
        <Link className={navLinkClassName} href="/admin/modelos">
          Modelos
        </Link>
        <Link className={navLinkClassName} href="/admin/applicants">
          Postulantes
        </Link>
        <Link className={navLinkClassName} href="/admin/metrics">
          Metricas
        </Link>
      </nav>
      <form action={signOutAction}>
        <Button
          variant="ghost"
          type="submit"
          className="bg-white/55 text-ink hover:bg-white dark:bg-slate-800/65 dark:text-slate-100 dark:hover:bg-slate-700/80"
        >
          Cerrar sesion
        </Button>
      </form>
    </div>
  );
}

