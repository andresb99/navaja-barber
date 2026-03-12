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
        className="block h-9 w-auto max-w-[8.75rem] shrink-0 object-contain min-[360px]:h-10 min-[360px]:max-w-[9.75rem] sm:h-[3.35rem] sm:max-w-none md:h-[3.75rem]"
        priority
      />
    </span>
  );
}
