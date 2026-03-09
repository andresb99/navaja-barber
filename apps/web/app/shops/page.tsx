import type { Metadata } from 'next';
import { ShopsMapMarketplace } from '@/components/public/shops-map-marketplace';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { listMarketplaceShops } from '@/lib/shops';

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Marketplace de barberias',
  description:
    'Descubre barberias activas, ubicaciones, servicios y reputacion dentro del marketplace de Beardly.',
  path: '/shops',
});

export default async function ShopsMarketplacePage() {
  const initialShops = await listMarketplaceShops();

  return <ShopsMapMarketplace initialShops={initialShops.slice(0, 16)} />;
}
