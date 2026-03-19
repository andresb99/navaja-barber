'use client';

import Image from 'next/image';
import NextLink from 'next/link';

interface ShopContextBarProps {
  shopName: string;
  logoUrl: string | null;
}

export function ShopContextBar({ shopName, logoUrl }: ShopContextBarProps) {
  return (
    <div className="relative">
      {/* Separator line — same treatment as navbar border */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.07]" />

      <div className="glass-nav mx-auto flex max-w-none items-center gap-2 px-4 py-2 md:px-6 lg:px-8">
        {/* Breadcrumb trail */}
        <NextLink
          href="/shops"
          className="flex-shrink-0 text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-200 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          Barberias
        </NextLink>

        {/* Divider chevron */}
        <svg
          className="h-3 w-3 flex-shrink-0 text-zinc-600 dark:text-zinc-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>

        {/* Current shop identity */}
        <div className="flex min-w-0 items-center gap-2">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={shopName}
              width={20}
              height={20}
              className="h-5 w-5 flex-shrink-0 rounded-md object-cover"
            />
          ) : (
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-zinc-300">
              {shopName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate text-[11px] font-semibold text-zinc-200 dark:text-zinc-200">
            {shopName}
          </span>
        </div>
      </div>
    </div>
  );
}
