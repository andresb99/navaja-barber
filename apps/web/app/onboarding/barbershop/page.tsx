import { BarbershopOnboardingForm } from '@/components/public/barbershop-onboarding-form';
import { requireAuthenticated } from '@/lib/auth';
import { Container } from '@/components/heroui/container';

export default async function BarbershopOnboardingPage() {
  await requireAuthenticated('/onboarding/barbershop');

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Owner onboarding</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.4rem] dark:text-slate-100">
              Crea un nuevo workspace para tu barbershop
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate/80 dark:text-slate-300">
              Este flujo usa un RPC seguro para crear el tenant, su suscripcion inicial, su
              membership de owner y la primera identidad admin del workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Paso 1
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Perfil</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Paso 2
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Tenant</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Paso 3
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Publicar</p>
            </div>
          </div>
        </div>
      </Container>

      <div className="soft-panel rounded-[2rem] p-6 md:p-8">
        <BarbershopOnboardingForm />
      </div>
    </section>
  );
}
