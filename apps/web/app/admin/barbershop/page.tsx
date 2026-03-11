import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { BadgeCheck, CreditCard, Globe, MapPin, ShieldCheck, type LucideIcon } from 'lucide-react';
import { AdminBarbershopSettingsForm } from '@/components/admin/barbershop-settings-form';
import { CustomDomainSettingsForm } from '@/components/admin/custom-domain-settings-form';
import { MercadoPagoSettingsPanel } from '@/components/admin/mercadopago-settings-panel';
import { requireAdmin } from '@/lib/auth';
import { buildShopHref } from '@/lib/shop-links';
import { getShopMercadoPagoAccountSummary } from '@/lib/shop-payment-accounts.server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type SubscriptionTier } from '@/lib/subscription-plans';
import { buildAdminHref } from '@/lib/workspace-routes';
import { Container } from '@/components/heroui/container';

interface AdminBarbershopSettingsPageProps {
  searchParams: Promise<{
    shop?: string;
    payments?: string;
  }>;
}

interface ShopRow {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  phone: string | null;
  description: string | null;
  cover_image_url: string | null;
  custom_domain: string | null;
  domain_status: string | null;
  domain_verified_at: string | null;
  booking_cancellation_notice_hours: number | null;
  booking_staff_cancellation_refund_mode: string | null;
  booking_cancellation_policy_text: string | null;
}

interface LocationRow {
  label: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface GalleryRow {
  id: string;
  public_url: string | null;
}

interface SubscriptionRow {
  shop_id: string;
  plan: SubscriptionTier;
}

type PanelMessageTone = 'success' | 'warning' | 'error';

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}

function resolveCurrentPlan(value: string | null | undefined): SubscriptionTier {
  const normalized = String(value || '').trim();
  if (
    normalized === 'free' ||
    normalized === 'pro' ||
    normalized === 'business' ||
    normalized === 'app_admin'
  ) {
    return normalized;
  }

  return 'free';
}

function resolvePaymentsMessage(value: string | null | undefined): {
  text: string;
  tone: PanelMessageTone;
} | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'connected') {
    return {
      text: 'Mercado Pago quedo conectado. Las nuevas reservas online se cobraran en la cuenta del dueno.',
      tone: 'success',
    };
  }

  if (normalized === 'disconnected') {
    return {
      text: 'Mercado Pago fue desconectado. Las reservas online quedaran deshabilitadas hasta reconectar una cuenta.',
      tone: 'warning',
    };
  }

  if (normalized === 'oauth_denied') {
    return {
      text: 'La autorizacion de Mercado Pago fue cancelada por el usuario.',
      tone: 'error',
    };
  }

  if (normalized === 'connect_error') {
    return {
      text: 'No se pudo conectar Mercado Pago. Verifica la configuracion OAuth y vuelve a intentar.',
      tone: 'error',
    };
  }

  if (normalized === 'disconnect_error') {
    return {
      text: 'No se pudo desconectar Mercado Pago. Intenta nuevamente.',
      tone: 'error',
    };
  }

  if (normalized === 'missing_code' || normalized === 'invalid_state') {
    return {
      text: 'La respuesta de Mercado Pago no se pudo validar. Inicia la conexion otra vez.',
      tone: 'error',
    };
  }

  return null;
}

function resolveDomainLabel(status: string | null | undefined) {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();
  if (normalized === 'active') {
    return 'Activo';
  }

  if (normalized === 'verified') {
    return 'Verificado';
  }

  if (normalized === 'pending') {
    return 'Pendiente';
  }

  if (normalized === 'failed') {
    return 'Con error';
  }

  return 'Sin dominio';
}

function resolveRefundModeLabel(value: string | null | undefined) {
  return value === 'manual_review' ? 'Revision manual' : 'Reembolso automatico';
}

function formatCancellationWindow(hours: number | null | undefined) {
  if (!Number.isInteger(hours) || Number(hours) < 0) {
    return '6 horas';
  }

  if (Number(hours) === 0) {
    return 'Hasta el inicio';
  }

  return `${Number(hours)} horas`;
}

function getProfileCompletionScore(input: {
  description: string | null;
  location: LocationRow | null;
  galleryCount: number;
  phone: string | null;
}) {
  const checks = [
    Boolean(String(input.description || '').trim()),
    Boolean(
      String(input.location?.label || '').trim() ||
      String(input.location?.city || '').trim() ||
      String(input.location?.region || '').trim(),
    ),
    input.galleryCount >= 1,
    input.galleryCount >= 3,
    Boolean(String(input.phone || '').trim()),
  ];

  return {
    completed: checks.filter(Boolean).length,
    total: checks.length,
  };
}

function SummaryCard({ icon: Icon, label, value, detail }: SummaryCardProps) {
  return (
    <Card className="admin-premium-card" shadow="none">
      <CardBody className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            <p className="text-sm text-default-500 leading-relaxed">{detail}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default async function AdminBarbershopSettingsPage({
  searchParams,
}: AdminBarbershopSettingsPageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const supabase = await createSupabaseServerClient();

  const [
    { data: shop },
    { data: location },
    { data: gallery },
    { data: subscription },
    paymentAccount,
  ] = await Promise.all([
    supabase
      .from('shops')
      .select(
        'id, name, slug, timezone, phone, description, cover_image_url, custom_domain, domain_status, domain_verified_at, booking_cancellation_notice_hours, booking_staff_cancellation_refund_mode, booking_cancellation_policy_text',
      )
      .eq('id', ctx.shopId)
      .maybeSingle(),
    supabase
      .from('shop_locations')
      .select('label, city, region, country_code, latitude, longitude')
      .eq('shop_id', ctx.shopId)
      .maybeSingle(),
    supabase
      .from('shop_gallery_images')
      .select('id, public_url, sort_order, created_at')
      .eq('shop_id', ctx.shopId)
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('subscriptions')
      .select('shop_id, plan, status')
      .eq('shop_id', ctx.shopId)
      .maybeSingle(),
    getShopMercadoPagoAccountSummary(ctx.shopId),
  ]);

  const shopData = (shop as ShopRow | null) || null;
  const locationData = (location as LocationRow | null) || null;
  const galleryRows = ((gallery || []) as GalleryRow[]).filter(
    (item) => typeof item.public_url === 'string' && item.public_url.trim().length > 0,
  );
  const subscriptionData = (subscription as SubscriptionRow | null) || null;
  const currentPlan = resolveCurrentPlan(subscriptionData?.plan);
  const paymentsMessage = resolvePaymentsMessage(params.payments);
  const publicProfileHref = buildShopHref(shopData?.slug || ctx.shopSlug);
  const publicBookingsHref = buildShopHref(shopData?.slug || ctx.shopSlug, 'book');
  const profileScore = getProfileCompletionScore({
    description: shopData?.description || null,
    location: locationData,
    galleryCount: galleryRows.length,
    phone: shopData?.phone || null,
  });
  const isPaymentsReady = Boolean(
    paymentAccount?.isActive && paymentAccount?.status === 'connected',
  );
  const layoutZones = [
    {
      title: 'Perfil publico',
      detail: 'Descripcion, fotos y ubicacion que alimentan el storefront y la reserva.',
    },
    {
      title: 'Operacion',
      detail: 'Slug, timezone y politicas para ordenar la gestion diaria del local.',
    },
    {
      title: 'Comercial',
      detail: 'Dominio y cobros en una columna separada del formulario.',
    },
  ];

  return (
    <section className="space-y-8">
      <Container
        variant="pageHeader"
        className="relative overflow-hidden rounded-[2.5rem] px-8 py-10 md:px-12 md:py-14"
      >
        <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] xl:items-center">
          <div className="space-y-6">
            <div>
              <Chip
                size="sm"
                color="primary"
                variant="flat"
                className="mb-4 font-medium tracking-wide"
              >
                Configuracion del local
              </Chip>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                {ctx.shopName}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-default-500">
                Gestiona el perfil publico de tu barberia, reglas de reserva, dominio personalizado
                y cuentas de cobro, todo en un solo lugar.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                as="a"
                href={publicProfileHref}
                target="_blank"
                rel="noreferrer"
                color="primary"
                variant="shadow"
                className="font-semibold"
                startContent={<Globe className="h-4 w-4" />}
              >
                Ver perfil publico
              </Button>
              <Button
                as="a"
                href={publicBookingsHref}
                target="_blank"
                rel="noreferrer"
                variant="flat"
                className="bg-default-100 font-semibold text-foreground hover:bg-default-200"
              >
                Abrir reservas
              </Button>
              <Button
                as="a"
                href={buildAdminHref('/admin', ctx.shopSlug)}
                variant="light"
                className="font-medium text-default-500"
              >
                Volver al panel
              </Button>
            </div>
          </div>

          <Card className="admin-premium-card" shadow="none">
            <CardBody className="p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary">
                Estructura de la pagina
              </p>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {layoutZones.map((zone) => (
                  <div
                    key={zone.title}
                    className="flex flex-col gap-1 rounded-2xl border border-default-200/50 bg-background/50 p-4 transition-colors hover:bg-default-100/50"
                  >
                    <p className="text-sm font-bold text-foreground">{zone.title}</p>
                    <p className="text-xs leading-relaxed text-default-500">{zone.detail}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </Container>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={BadgeCheck}
          label="Perfil publico"
          value={`${profileScore.completed}/${profileScore.total}`}
          detail="Completitud basica entre descripcion, ubicacion, fotos y telefono."
        />
        <SummaryCard
          icon={MapPin}
          label="Reservas"
          value={formatCancellationWindow(shopData?.booking_cancellation_notice_hours)}
          detail={resolveRefundModeLabel(shopData?.booking_staff_cancellation_refund_mode)}
        />
        <SummaryCard
          icon={Globe}
          label="Dominio"
          value={resolveDomainLabel(shopData?.domain_status)}
          detail={
            shopData?.custom_domain
              ? shopData.custom_domain
              : 'Tu storefront sigue usando la ruta publica /shops/{slug}.'
          }
        />
        <SummaryCard
          icon={CreditCard}
          label="Cobros"
          value={isPaymentsReady ? 'Listos' : 'Pendientes'}
          detail={
            isPaymentsReady
              ? 'Mercado Pago conectado para cobrar reservas online.'
              : 'Conecta una cuenta para habilitar cobros online.'
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
        <Card className="border-none bg-transparent shadow-none">
          <CardBody className="p-0 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 px-2">
              <div className="max-w-xl">
                <Chip
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="mb-3 font-medium tracking-wide"
                >
                  Perfil y operacion
                </Chip>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Lo que define tu storefront
                </h2>
                <p className="mt-2 text-sm text-default-500 leading-relaxed">
                  Nombre, slug, fotos, ubicacion y politicas visibles para clientes. Todo lo que
                  impacta la lectura del perfil publico y el flujo de reserva se edita aqui.
                </p>
              </div>
              <Chip
                color={profileScore.completed >= 4 ? 'success' : 'default'}
                variant={profileScore.completed >= 4 ? 'flat' : 'faded'}
                className="font-medium mt-1"
              >
                {profileScore.completed}/{profileScore.total} listo
              </Chip>
            </div>

            <AdminBarbershopSettingsForm
              shopId={ctx.shopId}
              initialShopName={shopData?.name || ctx.shopName}
              initialShopSlug={shopData?.slug || ctx.shopSlug}
              initialTimezone={shopData?.timezone || ctx.shopTimezone}
              initialPhone={shopData?.phone || null}
              initialDescription={shopData?.description || null}
              initialLocationLabel={locationData?.label || null}
              initialCity={locationData?.city || null}
              initialRegion={locationData?.region || null}
              initialCountryCode={locationData?.country_code || 'UY'}
              initialLatitude={locationData?.latitude ?? null}
              initialLongitude={locationData?.longitude ?? null}
              initialCoverImageUrl={shopData?.cover_image_url || null}
              initialBookingCancellationNoticeHours={
                shopData?.booking_cancellation_notice_hours ?? 6
              }
              initialBookingRefundMode={
                shopData?.booking_staff_cancellation_refund_mode === 'manual_review'
                  ? 'manual_review'
                  : 'automatic_full'
              }
              initialBookingPolicyText={shopData?.booking_cancellation_policy_text || null}
              initialGalleryImages={galleryRows.map((item) => ({
                id: item.id,
                publicUrl: String(item.public_url),
              }))}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <div className="admin-premium-accent rounded-[2rem] px-6 py-6 md:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <Chip
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="mb-3 font-medium tracking-wide"
                >
                  Comercial y canales
                </Chip>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Dominio y cobros
                </h2>
                <p className="mt-2 text-sm text-default-500 leading-relaxed">
                  Esta columna separa la capa comercial del perfil publico para que la pagina no se
                  lea como un unico formulario gigante.
                </p>
              </div>
            </div>
          </div>

          <Card className="admin-premium-card" shadow="none">
            <CardBody className="space-y-5 p-5 md:p-6">
              <div>
                <p className="hero-eyebrow">Custom Domain</p>
                <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold text-ink dark:text-slate-100">
                  Dominio personalizado
                </h3>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Si tu plan lo permite, conecta un dominio propio para que el storefront publico
                  viva en tu marca.
                </p>
              </div>

              <CustomDomainSettingsForm
                shopId={ctx.shopId}
                currentPlan={currentPlan}
                initialCustomDomain={shopData?.custom_domain || null}
                initialDomainStatus={shopData?.domain_status || null}
                initialDomainVerifiedAt={shopData?.domain_verified_at || null}
                timeZone={shopData?.timezone || ctx.shopTimezone}
              />
            </CardBody>
          </Card>

          <Card className="admin-premium-card" shadow="none">
            <CardBody className="space-y-5 p-5 md:p-6">
              <div>
                <p className="hero-eyebrow">Pagos online</p>
                <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold text-ink dark:text-slate-100">
                  Cobros de reservas
                </h3>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Cada barberia debe conectar su propia cuenta para cobrar reservas online
                  directamente.
                </p>
              </div>

              <MercadoPagoSettingsPanel
                shopSlug={ctx.shopSlug}
                account={paymentAccount}
                timeZone={shopData?.timezone || ctx.shopTimezone}
                message={paymentsMessage}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
