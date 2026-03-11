'use client';

import Image from 'next/image';
import { cn } from '@/lib/cn';

interface HeaderBrandProps {
  className?: string;
}

export function HeaderBrand({ className }: HeaderBrandProps) {
  return (
    <span className={cn('flex h-full items-center', className)}>
      <Image
        src="/beardly-logo-header.png"
        alt="Logo de Beardly"
        width={774}
        height={297}
        quality={100}
        className="block h-12 w-auto shrink-0 object-contain sm:h-[3.35rem] md:h-[3.75rem]"
        priority
      />
    </span>
  );
}
