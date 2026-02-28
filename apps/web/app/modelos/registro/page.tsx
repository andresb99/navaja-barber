import Link from 'next/link';
import { ModelRegistrationForm } from '@/components/public/model-registration-form';
import { SHOP_ID } from '@/lib/constants';
import { getOpenModelCalls } from '@/lib/modelos';

interface ModelRegistrationPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ModelRegistrationPage({ searchParams }: ModelRegistrationPageProps) {
  const params = await searchParams;
  const openCalls = await getOpenModelCalls();

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Registro de modelos</p>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Postulate para practicas con un flujo mas claro
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Completa tu perfil, preferencias y consentimientos desde una sola vista. Luego
              coordinamos por WhatsApp.
            </p>
            <Link
              href="/modelos"
              className="mt-4 inline-flex text-sm font-semibold text-ink dark:text-slate-100"
            >
              Ver convocatorias abiertas
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Sesion
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Opcional</p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Puedes anotarte a una fecha puntual.
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Preferencias
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                Personalizadas
              </p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Barba, largo, corto, rulos o color.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ModelRegistrationForm
        shopId={SHOP_ID}
        {...(params.session_id ? { initialSessionId: params.session_id } : {})}
        sessions={openCalls.map((call) => ({
          session_id: call.session_id,
          label: `${call.course_title} - ${new Date(call.start_at).toLocaleString('es-UY')}`,
        }))}
      />
    </section>
  );
}
