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
      <div className="section-hero px-6 py-7 md:px-8 md:py-8">
        <div className="relative z-10">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.1rem] dark:text-slate-100">
            Registro de modelos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
            Completando este formulario te postulas para practicas de cursos. Te contactamos por WhatsApp para cerrar
            detalles.
          </p>
          <Link href="/modelos" className="mt-2 inline-block text-sm">
            Ver convocatorias abiertas
          </Link>
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
