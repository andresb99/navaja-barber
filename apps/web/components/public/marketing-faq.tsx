'use client';

import { Accordion, AccordionItem } from '@heroui/react';

interface FaqItem {
  question: string;
  answer: string;
}

export function MarketingFaqAccordion({ items }: { items: readonly FaqItem[] }) {
  return (
    <Accordion
      variant="splitted"
      itemClasses={{
        base: 'surface-card !shadow-none border-1 border-white/50 dark:border-white/6',
        title: 'text-sm font-semibold text-ink dark:text-slate-100',
        content: 'text-sm text-slate/80 dark:text-slate-300 pb-4',
        trigger: 'py-4 px-1',
        indicator: 'text-slate/60 dark:text-slate-400',
      }}
    >
      {items.map((item, index) => (
        <AccordionItem key={`faq-${index}`} aria-label={item.question} title={item.question}>
          {item.answer}
        </AccordionItem>
      ))}
    </Accordion>
  );
}
