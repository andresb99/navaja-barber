import Link from 'next/link';

interface ShopPageBreadcrumbProps {
  shopName: string;
  shopHref: string;
}

export function ShopPageBreadcrumb({ shopName, shopHref }: ShopPageBreadcrumbProps) {
  return (
    <nav className="-mb-2 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
      <Link href="/shops" className="transition-colors hover:text-zinc-600 dark:hover:text-zinc-300">
        Barberias
      </Link>
      <span>/</span>
      <a href={shopHref} className="transition-colors hover:text-zinc-600 dark:hover:text-zinc-300">
        {shopName}
      </a>
    </nav>
  );
}
