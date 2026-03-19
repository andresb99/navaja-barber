'use client';

import Image from 'next/image';
import { BreadcrumbItem, Breadcrumbs } from '@heroui/breadcrumbs';

interface ShopContextBarProps {
  shopName: string;
  logoUrl: string | null;
}

export function ShopContextBar({ shopName, logoUrl }: ShopContextBarProps) {
  return (
    <div className="-mt-4 mb-6 px-0">
      <Breadcrumbs
        size="sm"
        classNames={{
          list: 'gap-1 flex-nowrap',
        }}
        itemClasses={{
          item: 'text-[11px] font-medium text-zinc-400 data-[current=true]:text-zinc-300 dark:text-zinc-500 dark:data-[current=true]:text-zinc-300',
          separator: 'text-zinc-600 dark:text-zinc-600',
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
                width={14}
                height={14}
                className="h-3.5 w-3.5 rounded object-cover"
              />
            ) : (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-white/10 text-[8px] font-bold text-zinc-400">
                {shopName.charAt(0).toUpperCase()}
              </span>
            )
          }
        >
          {shopName}
        </BreadcrumbItem>
      </Breadcrumbs>
    </div>
  );
}
