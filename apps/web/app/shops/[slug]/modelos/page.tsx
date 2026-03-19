import { redirect } from 'next/navigation';
import { normalizeShopSlug } from '@/lib/shop-links';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ShopModelosRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/modelos/${normalizeShopSlug(slug)}`);
}
