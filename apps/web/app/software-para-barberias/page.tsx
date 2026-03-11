import type { Metadata } from 'next';
import Link from 'next/link';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { Container } from '@/components/heroui/container';

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Software para barberias',
  description:
    'Software para barberias con agenda online, pagos, staff, cursos, marketplace y metricas en una sola plataforma.',
  path: '/software-para-barberias',
});

const sections = [
  {
    title: 'Reservas y pagos',
    copy: 'Permite reservas online por barberia, staff y servicio. Si el cliente no marca pagar en el local, el flujo abre checkout online con validacion final del horario.',
  },
  {
    title: 'Operacion del local',
    copy: 'Agenda diaria, bloqueos, ausencias, estados de cita, no-shows, metricas y control operativo para admins y staff desde web y mobile.',
  },
  {
    title: 'Crecimiento del negocio',
    copy: 'Marketplace publico, reseñas verificadas, bolsa de trabajo, cursos y captacion de modelos sobre la misma base de datos del local.',
  },
] as const;

const faqs = [
  {
    question: 'Sirve si mi barberia cobra online y tambien acepta pago en el local?',
    answer:
      'Si. El flujo soporta ambas opciones dentro de la misma reserva. Si el cliente no marca pagar en el local, pasa por checkout online.',
  },
  {
    question: 'Puedo manejar varias barberias o varios equipos?',
    answer:
      'Si. La plataforma ya trabaja con workspaces, roles y contexto activo por barberia tanto en web como en mobile.',
  },
  {
    question: 'Que pasa si el local cancela una cita pagada?',
    answer:
      'La plataforma procesa el reembolso automaticamente por defecto y deja trazabilidad del estado del pago en citas y payment intents.',
  },
] as const;

export default function SoftwareParaBarberiasPage() {
  return (
    <section className="space-y-6">
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Plataforma SaaS</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold text-ink md:text-[3rem] dark:text-slate-100">
              Software para barberias con agenda, pagos, staff y crecimiento.
            </h1>
            <p className="mt-4 max-w-3xl text-base text-slate/80 dark:text-slate-300">
              Beardly centraliza reservas, agenda operativa, cobros, marketplace, cursos y
              seguimiento del negocio para que una barberia no dependa de herramientas sueltas.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/suscripcion"
                className="action-primary rounded-full px-5 py-3 text-sm font-semibold"
              >
                Ver planes
              </Link>
              <Link
                href="/shops"
                className="action-secondary rounded-full px-5 py-3 text-sm font-semibold"
              >
                Ver marketplace
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Checkout
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Pago online o en local dentro del mismo flujo
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Operacion
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Admin y staff gestionando citas, horarios y bloqueos
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Growth
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                Marketplace, bolsa de trabajo y cursos
              </p>
            </div>
          </div>
        </div>
      </Container>

      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="soft-panel rounded-[1.8rem] p-5">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
              {section.title}
            </h2>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">{section.copy}</p>
          </div>
        ))}
      </div>

      <div className="soft-panel rounded-[1.8rem] p-5">
        <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-slate-100">
          FAQ para barberias
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {faqs.map((item) => (
            <div key={item.question} className="surface-card">
              <p className="text-sm font-semibold text-ink dark:text-slate-100">{item.question}</p>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
