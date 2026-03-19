import { redirect } from 'next/navigation';
import { normalizeShopSlug } from '@/lib/shop-links';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ShopModelRegistrationRedirect({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const base = `/modelos/${normalizeShopSlug(slug)}/registro`;
  redirect(query.session_id ? `${base}?session_id=${encodeURIComponent(query.session_id)}` : base);
}
