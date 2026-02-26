'use client';

import Image from 'next/image';
import TrueFocus from '@/components/reactbits/TrueFocus';
import { cn } from '@/lib/cn';

interface HeaderBrandProps {
  className?: string;
}

export function HeaderBrand({ className }: HeaderBrandProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <span className="relative h-10 w-10 overflow-hidden rounded-full shadow-halo">
        <Image src="/logo-navaja.svg" alt="Logo de Navaja" fill sizes="40px" className="object-cover" priority />
      </span>
      <TrueFocus
        sentence="Navaja Barber"
        separator=" "
        blurAmount={0.45}
        borderColor="rgba(234, 176, 72, 0.92)"
        glowColor="rgba(234, 176, 72, 0.56)"
        animationDuration={0.42}
        pauseBetweenAnimations={2.2}
        className="!inline-flex !items-center !justify-start !flex-nowrap !gap-1.5"
        wordClassName="!text-[1.02rem] !font-[family-name:var(--font-heading)] !font-bold !tracking-tight !leading-none !cursor-default !text-slate-950 !drop-shadow-[0_1px_0_rgba(255,255,255,0.4)] dark:!text-slate-50 dark:!drop-shadow-[0_1px_8px_rgba(2,6,23,0.7)]"
        cornerClassName="!h-2.5 !w-2.5 !border-2 !rounded-sm"
      />
    </span>
  );
}
