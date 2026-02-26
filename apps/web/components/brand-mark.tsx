import Image from 'next/image';
import { cn } from '@/lib/cn';

interface BrandMarkProps {
  className?: string;
  compact?: boolean;
  tone?: 'light' | 'dark';
}

export function BrandMark({ className, compact = false, tone = 'dark' }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <span className="relative h-10 w-10 overflow-hidden rounded-full shadow-halo">
        <Image src="/logo-navaja.svg" alt="Logo de Navaja" fill sizes="40px" className="object-cover" priority />
      </span>
      {!compact ? (
        <span className="inline-flex flex-col leading-none">
          <span
            className={cn(
              'font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight',
              tone === 'light' ? 'text-white' : 'text-ink',
            )}
          >
            Navaja
          </span>
          <span
            className={cn(
              'text-[11px] uppercase tracking-[0.2em]',
              tone === 'light' ? 'text-brass' : 'text-slate/70',
            )}
          >
            Barberia
          </span>
        </span>
      ) : null}
    </span>
  );
}
