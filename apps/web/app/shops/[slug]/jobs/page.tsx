import { redirect } from 'next/navigation';
import { normalizeShopSlug } from '@/lib/shop-links';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ShopJobsRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/jobs/${normalizeShopSlug(slug)}`);
}
