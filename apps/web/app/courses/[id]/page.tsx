import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getRequestOriginFromHeaders } from '@/lib/request-origin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildTenantCanonicalCourseHref } from '@/lib/tenant-public-urls';

interface SubscriptionRow {
  plan: string | null;
  status: string | null;
}

interface CourseDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailsPage({ params }: CourseDetailsPageProps) {
  const { id } = await params;
  const headerStore = await headers();
  const requestOrigin = getRequestOriginFromHeaders(headerStore);
  const supabase = createSupabaseAdminClient();

  const { data: course } = await supabase
    .from('courses')
    .select('id, shop_id, is_active')
    .eq('id', id)
    .maybeSingle();

  if (!course || !course.is_active) {
    notFound();
  }

  const { data: shop } = await supabase
    .from('shops')
    .select('slug, status, custom_domain, domain_status')
    .eq('id', String(course.shop_id))
    .eq('status', 'active')
    .maybeSingle();

  if (!shop?.slug) {
    notFound();
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('shop_id', String(course.shop_id))
    .maybeSingle();

  redirect(
    buildTenantCanonicalCourseHref(
      {
        slug: shop.slug,
        status: shop.status,
        customDomain: shop.custom_domain,
        domainStatus: shop.domain_status,
        plan: (subscription as SubscriptionRow | null)?.plan || 'free',
        subscriptionStatus: (subscription as SubscriptionRow | null)?.status || 'active',
      },
      id,
      { requestOrigin },
    ),
  );
}
