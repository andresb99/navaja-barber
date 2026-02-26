import type React from 'react';
import { cn } from '@/lib/cn';

const toneMap = {
  neutral: 'bg-slate/12 text-slate ring-1 ring-slate/15 dark:bg-white/10 dark:text-slate-100 dark:ring-slate-500/30',
  success:
    'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/45 dark:text-emerald-200 dark:ring-emerald-700/35',
  warning:
    'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/45 dark:text-amber-200 dark:ring-amber-700/35',
  danger:
    'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-900/45 dark:text-red-200 dark:ring-red-700/35',
};

type BadgeTone = keyof typeof toneMap;

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/40 px-2.5 py-1 text-xs font-semibold tracking-[0.02em]',
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}


