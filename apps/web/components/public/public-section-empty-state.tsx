import Link from 'next/link';
import { Container } from '@/components/heroui/container';

interface PublicSectionEmptyStateProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PublicSectionEmptyState({
  eyebrow,
  title,
  description,
}: PublicSectionEmptyStateProps) {
  return (
    <section className="space-y-6">
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 max-w-3xl">
          <p className="hero-eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.45rem] dark:text-slate-100">
            {title}
          </h1>
          <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">{description}</p>
        </div>
      </Container>

      <div className="soft-panel rounded-[1.8rem] p-6">
        <p className="text-sm text-slate/80 dark:text-slate-300">
          Todavia no hay barberias publicadas para mostrar esta seccion.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/shops"
            className="action-secondary rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            Volver al marketplace
          </Link>
          <Link
            href="/onboarding/barbershop"
            className="action-primary rounded-2xl px-4 py-2 text-sm font-semibold"
          >
            Crear la primera barberia
          </Link>
        </div>
      </div>
    </section>
  );
}
