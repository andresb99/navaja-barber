'use client';

import Image from 'next/image';
import NextLink from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ShopContextBarProps {
  shopName: string;
  logoUrl: string | null;
}

export function ShopContextBar({ shopName, logoUrl }: ShopContextBarProps) {
  return (
    <div className="border-b border-zinc-200/60 bg-surface-sheet/80 backdrop-blur-sm dark:border-zinc-700/40 dark:bg-zinc-900/60">
      <div className="mx-auto flex max-w-none items-center justify-between px-4 py-2 md:px-6 lg:px-8">
        {/* Shop identity */}
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={shopName}
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-cover"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {shopName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-sm font-semibold text-ink dark:text-slate-100">{shopName}</span>
        </div>

        {/* Back to marketplace */}
        <NextLink
          href="/shops"
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-ink dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ver más barberias
        </NextLink>
      </div>
    </div>
  );
}
