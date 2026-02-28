import { SHOP_ID } from '@/lib/constants';
import { JobsForm } from '@/components/public/jobs-form';

export default function JobsPage() {
  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Talento Navaja</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Sumate al equipo con una postulacion mas cuidada
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Este flujo ahora transmite mas seriedad visual para captar barberos y aprendices con
              mejor percepcion de marca.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Perfil
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Barberos</p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Senior o en desarrollo.
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                CV
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Adjunto</p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                PDF o DOC hasta 5 MB.
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Respuesta
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Directa</p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Contacto del equipo luego del envio.
              </p>
            </div>
          </div>
        </div>
      </div>
      <JobsForm shopId={SHOP_ID} />
    </section>
  );
}
