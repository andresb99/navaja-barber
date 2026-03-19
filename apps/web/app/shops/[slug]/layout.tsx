import { notFound } from 'next/navigation';
import { ShopContextBar } from '@/components/public/shop-context-bar';
import { getMarketplaceShopBySlug } from '@/lib/shops';

interface ShopLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function ShopLayout({ children, params }: ShopLayoutProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    notFound();
  }

  return (
    <>
      <ShopContextBar
        shopName={shop.name}
        logoUrl={shop.logo_url ?? null}
      />
      {children}
    </>
  );
}
