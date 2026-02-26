'use client';

import Image from 'next/image';
import { cn } from '@/lib/cn';

interface HeaderBrandProps {
  className?: string;
}

export function HeaderBrand({ className }: HeaderBrandProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/25">
        <Image
          src="/logo-navaja-hq.jpg"
          alt="Logo de Navaja"
          fill
          sizes="40px"
          quality={100}
          className="object-contain"
          priority
        />
      </span>
      <span className="inline-flex flex-col leading-none">
        <span className="font-[family-name:var(--font-heading)] text-sm font-semibold tracking-tight text-white">
          Navaja Barber
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/72">Studio</span>
      </span>
    </span>
  );
}
