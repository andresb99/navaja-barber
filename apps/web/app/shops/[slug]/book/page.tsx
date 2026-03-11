import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookingFlow } from '@/components/public/booking-flow';
import { getMarketplaceShopBySlug } from '@/lib/shops';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildTenantPageMetadata } from '@/lib/tenant-public-metadata';
import { Container } from '@/components/heroui/container';

interface ShopBookPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ShopBookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    return {};
  }

  return buildTenantPageMetadata({
    shop,
    title: `Reservar en ${shop.name}`,
    description: `Reserva online servicios y horarios disponibles en ${shop.name}.`,
    section: 'book',
    noIndex: true,
  });
}

export default async function ShopBookPage({ params }: ShopBookPageProps) {
  const { slug } = await params;
  const shop = await getMarketplaceShopBySlug(slug);

  if (!shop) {
    notFound();
  }

  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();
  const metadata = (user?.user_metadata as Record<string, unknown> | undefined) ?? undefined;
  const metadataFullName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    '';

  const { data: profile } = user?.id
    ? await sessionSupabase
        .from('user_profiles')
        .select(
          'full_name, phone, preferred_payment_method, preferred_card_brand, preferred_card_last4',
        )
        .eq('auth_user_id', user.id)
        .maybeSingle()
    : {
        data: null as {
          full_name?: string | null;
          phone?: string | null;
          preferred_payment_method?: string | null;
          preferred_card_brand?: string | null;
          preferred_card_last4?: string | null;
        } | null,
      };

  const initialCustomerName =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) || metadataFullName || '';
  const initialCustomerPhone = (typeof profile?.phone === 'string' && profile.phone.trim()) || '';
  const preferredMethodRaw =
    (typeof profile?.preferred_payment_method === 'string' &&
      profile.preferred_payment_method.trim()) ||
    null;
  const preferredCardBrand =
    (typeof profile?.preferred_card_brand === 'string' && profile.preferred_card_brand.trim()) ||
    null;
  const preferredCardLast4 =
    (typeof profile?.preferred_card_last4 === 'string' && profile.preferred_card_last4.trim()) ||
    null;
  const preferredPaymentMethod =
    preferredMethodRaw === 'card'
      ? `Tarjeta${preferredCardBrand ? ` ${preferredCardBrand}` : ''}${preferredCardLast4 ? ` ****${preferredCardLast4}` : ''}`
      : preferredMethodRaw === 'mercado_pago'
        ? 'Mercado Pago'
        : preferredMethodRaw === 'cash'
          ? 'Efectivo en local'
          : null;

  const supabase = createSupabaseAdminClient();

  const [{ data: services }, { data: staff }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_cents, duration_minutes')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('staff')
      .select('id, name')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('name'),
  ]);

  return (
    <section className="space-y-6">
      <Container variant="hero" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Reservas online</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.4rem] dark:text-slate-100">
              Agenda en {shop.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              El flujo queda aislado por tenant: solo veras servicios, staff y horarios de esta
              barbershop.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Servicios
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(services || []).length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Staff
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(staff || []).length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Zona horaria
              </p>
              <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                {shop.timezone}
              </p>
            </div>
          </div>
        </div>
      </Container>

      <BookingFlow
        shopId={shop.id}
        initialCustomerEmail={user?.email || ''}
        initialCustomerName={initialCustomerName}
        initialCustomerPhone={initialCustomerPhone}
        preferredPaymentMethod={preferredPaymentMethod}
        cancellationNoticeHours={shop.bookingCancellationNoticeHours}
        staffCancellationRefundMode={shop.bookingStaffCancellationRefundMode}
        cancellationPolicyText={shop.bookingCancellationPolicyText}
        services={(services || []).map((item) => ({
          id: item.id as string,
          name: item.name as string,
          price_cents: item.price_cents as number,
          duration_minutes: item.duration_minutes as number,
        }))}
        staff={(staff || []).map((item) => ({
          id: item.id as string,
          name: item.name as string,
        }))}
      />
    </section>
  );
}
