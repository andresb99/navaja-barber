import { redirect } from 'next/navigation';
import { normalizeShopSlug } from '@/lib/shop-links';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ShopBookRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/book/${normalizeShopSlug(slug)}`);
}
