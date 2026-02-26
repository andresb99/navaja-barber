import type React from 'react';
import { cn } from '@/lib/cn';

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full text-left text-sm text-slate/90 dark:text-slate-100', className)} {...props} />;
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-slate/20 px-3 py-2.5 font-medium uppercase tracking-[0.14em] text-slate/60 dark:border-slate-700 dark:text-slate-300',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('border-b border-slate/10 px-3 py-2.5 align-top dark:border-slate-700', className)} {...props} />
  );
}


