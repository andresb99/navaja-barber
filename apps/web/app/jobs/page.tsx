import { SHOP_ID } from '@/lib/constants';
import { JobsForm } from '@/components/public/jobs-form';

export default function JobsPage() {
  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-8">
        <div className="relative z-10">
          <p className="inline-flex rounded-full border border-slate/20 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/80 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            Talento Navaja
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.1rem] dark:text-slate-100">
            Sumate al equipo
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
            Estamos buscando barberos y aprendices. Compartinos tu perfil y CV para iniciar el proceso.
          </p>
        </div>
      </div>
      <JobsForm shopId={SHOP_ID} />
    </section>
  );
}

