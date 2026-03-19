'use client';

import Image from 'next/image';
import { BreadcrumbItem, Breadcrumbs } from '@heroui/breadcrumbs';

interface ShopContextBarProps {
  shopName: string;
  logoUrl: string | null;
}

export function ShopContextBar({ shopName, logoUrl }: ShopContextBarProps) {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.07]" />
      <div className="glass-nav mx-auto flex max-w-none items-center px-4 py-1.5 md:px-6 lg:px-8">
        <Breadcrumbs
          size="sm"
          classNames={{
            list: 'gap-1',
          }}
          itemClasses={{
            item: 'text-[11px] font-medium text-zinc-400 data-[current=true]:text-zinc-200 dark:text-zinc-500 dark:data-[current=true]:text-zinc-200',
            separator: 'text-zinc-600',
          }}
        >
          <BreadcrumbItem href="/shops">Barberias</BreadcrumbItem>
          <BreadcrumbItem
            isCurrent
            startContent={
              logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={shopName}
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded object-cover"
                />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded bg-white/10 text-[9px] font-bold text-zinc-300">
                  {shopName.charAt(0).toUpperCase()}
                </span>
              )
            }
          >
            {shopName}
          </BreadcrumbItem>
        </Breadcrumbs>
      </div>
    </div>
  );
}
