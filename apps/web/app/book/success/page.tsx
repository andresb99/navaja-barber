import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessPageProps {
  searchParams: Promise<{
    appointment?: string;
    start?: string;
    staff?: string;
    service?: string;
  }>;
}

export default async function BookingSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;

  return (
    <section className="mx-auto max-w-2xl">
      <div className="section-hero px-6 py-8 md:px-8">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/70 bg-emerald-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200">
            <BadgeCheck className="h-3.5 w-3.5" />
            Reserva creada
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink dark:text-slate-100">
            Recibimos tu solicitud
          </h1>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
            Tu turno fue generado correctamente. Te confirmamos en breve por WhatsApp o email.
          </p>

          <dl className="mt-6 grid gap-2 text-sm">
            <div className="surface-card">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate/65">ID de cita</dt>
              <dd className="mt-1 font-medium text-ink dark:text-slate-100">{params.appointment || 'Pendiente'}</dd>
            </div>
            <div className="surface-card">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate/65">Servicio</dt>
              <dd className="mt-1 font-medium text-ink dark:text-slate-100">
                {params.service || 'Servicio seleccionado'}
              </dd>
            </div>
            <div className="surface-card">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate/65">Barbero</dt>
              <dd className="mt-1 font-medium text-ink dark:text-slate-100">{params.staff || 'Asignado'}</dd>
            </div>
            <div className="surface-card">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate/65">Horario de inicio (UTC)</dt>
              <dd className="mt-1 font-medium text-ink dark:text-slate-100">{params.start || 'A confirmar'}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/book" className="no-underline">
                Agendar otra
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/" className="no-underline">
                Volver al inicio
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

