import type React from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'soft-panel rounded-3xl border border-white/45 p-5 dark:border-slate-700/70',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.018em] text-ink md:text-[1.38rem] dark:text-slate-100',
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-sm text-slate/80 dark:text-slate-300', className)} {...props} />;
}


