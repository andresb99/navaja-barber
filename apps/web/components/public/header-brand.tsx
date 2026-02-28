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
        sizes="(max-width: 768px) 136px, 160px"
        quality={100}
        className="block h-full w-auto shrink-0 object-contain"
        priority
      />
    </span>
  );
}
