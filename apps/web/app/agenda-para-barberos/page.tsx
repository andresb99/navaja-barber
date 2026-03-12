import type { Metadata } from 'next';
import {
  publicMarketingAgendaBenefits,
  publicMarketingAgendaHero,
  publicMarketingAgendaWorkflowSteps,
} from '@navaja/shared';
import { MarketingHero, MarketingPanel, MarketingSurfaceCard } from '@/components/public/marketing';
import { buildSitePageMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Agenda para barberos',
  description:
    'Agenda para barberos con disponibilidad en tiempo real, estados de cita, bloqueos, ausencias y pagos online.',
  path: '/agenda-para-barberos',
});

export default function AgendaParaBarberosPage() {
  return (
    <section className="space-y-6">
      <MarketingHero
        eyebrow={publicMarketingAgendaHero.eyebrow}
        title={publicMarketingAgendaHero.title}
        description={publicMarketingAgendaHero.description}
        actions={publicMarketingAgendaHero.actions}
        aside={
          <MarketingPanel
            eyebrow="Flujo operativo"
            eyebrowClassName="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400"
          >
            <div className="space-y-3">
              {publicMarketingAgendaWorkflowSteps.map((step, index) => (
                <MarketingSurfaceCard
                  key={step}
                  eyebrow={`Paso ${index + 1}`}
                  description={step}
                  descriptionClassName="text-sm text-slate/85 dark:text-slate-300"
                />
              ))}
            </div>
          </MarketingPanel>
        }
        layoutClassName="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"
        titleClassName="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold text-ink md:text-[3rem] dark:text-slate-100"
        descriptionClassName="mt-4 max-w-3xl text-base text-slate/80 dark:text-slate-300"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {publicMarketingAgendaBenefits.map((benefit) => (
          <MarketingPanel
            key={benefit.title}
            title={benefit.title}
            description={benefit.description}
          />
        ))}
      </div>
    </section>
  );
}
