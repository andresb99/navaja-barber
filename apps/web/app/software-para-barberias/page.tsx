import type { Metadata } from 'next';
import {
  publicMarketingSoftwareFaqs,
  publicMarketingSoftwareHero,
  publicMarketingSoftwareSections,
} from '@navaja/shared';
import { MarketingHero, MarketingPanel, MarketingSurfaceCard } from '@/components/public/marketing';
import { buildSitePageMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Software para barberias',
  description:
    'Software para barberias con agenda online, pagos, staff, cursos, marketplace y metricas en una sola plataforma.',
  path: '/software-para-barberias',
});

export default function SoftwareParaBarberiasPage() {
  return (
    <section className="space-y-6">
      <MarketingHero
        eyebrow={publicMarketingSoftwareHero.eyebrow}
        title={publicMarketingSoftwareHero.title}
        description={publicMarketingSoftwareHero.description}
        actions={publicMarketingSoftwareHero.actions}
        stats={publicMarketingSoftwareHero.stats}
        layoutClassName="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"
        titleClassName="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold text-ink md:text-[3rem] dark:text-slate-100"
        descriptionClassName="mt-4 max-w-3xl text-base text-slate/80 dark:text-slate-300"
        statsClassName="grid gap-3 sm:grid-cols-3 lg:grid-cols-1"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {publicMarketingSoftwareSections.map((section) => (
          <MarketingPanel
            key={section.title}
            title={section.title}
            description={section.description}
          />
        ))}
      </div>

      <MarketingPanel
        title="FAQ para barberias"
        titleClassName="font-[family-name:var(--font-heading)] text-3xl font-semibold text-ink dark:text-slate-100"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {publicMarketingSoftwareFaqs.map((item) => (
            <MarketingSurfaceCard
              key={item.question}
              title={item.question}
              description={item.answer}
            />
          ))}
        </div>
      </MarketingPanel>
    </section>
  );
}
