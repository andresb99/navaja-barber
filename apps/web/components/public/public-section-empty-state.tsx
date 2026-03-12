import Link from 'next/link';
import {
  MarketingHero,
  MarketingPanel,
  marketingCtaClassNames,
} from '@/components/public/marketing';

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
      <MarketingHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        layoutClassName="relative z-10 max-w-3xl"
        titleClassName="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.45rem] dark:text-slate-100"
        descriptionClassName="mt-3 text-sm text-slate/80 dark:text-slate-300"
      />

      <MarketingPanel className="p-6">
        <p className="text-sm text-slate/80 dark:text-slate-300">
          Todavia no hay barberias publicadas para mostrar esta seccion.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/shops" className={marketingCtaClassNames.panelSecondary}>
            Volver al marketplace
          </Link>
          <Link href="/onboarding/barbershop" className={marketingCtaClassNames.panelPrimary}>
            Crear la primera barberia
          </Link>
        </div>
      </MarketingPanel>
    </section>
  );
}
