import Link from 'next/link';
import { Card, CardBody } from '@heroui/card';
import {
  BadgeCheck,
  CreditCard,
  Globe,
  MapPin,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { AdminBarbershopSettingsForm } from '@/components/admin/barbershop-settings-form';
import { CustomDomainSettingsForm } from '@/components/admin/custom-domain-settings-form';
import { MercadoPagoSettingsPanel } from '@/components/admin/mercadopago-settings-panel';
import { SubscriptionBillingPanel } from '@/components/admin/subscription-billing-panel';
import { requireAdmin } from '@/lib/auth';
import { buildShopHref } from '@/lib/shop-links';
import { getShopMercadoPagoAccountSummary } from '@/lib/shop-payment-accounts.server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getSubscriptionPlanDescriptor,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@/lib/subscription-plans';
import { buildAdminHref } from '@/lib/workspace-routes';

interface AdminBarbershopSettingsPageProps {
  searchParams: Promise<{
    shop?: string;
    billing?: string;
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
  status: SubscriptionStatus;
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

function resolveCurrentStatus(value: string | null | undefined): SubscriptionStatus {
  const normalized = String(value || '').trim();
  if (
    normalized === 'active' ||
    normalized === 'trialing' ||
    normalized === 'past_due' ||
    normalized === 'cancelled'
  ) {
    return normalized;
  }

  return 'active';
}

function resolveBillingMessage(value: string | null | undefined) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'success' || normalized === 'pending' || normalized === 'failure') {
    return normalized;
  }

  return null;
}

function resolvePaymentsMessage(value: string | null | undefined): {
  text: string;
  tone: PanelMessageTone;
} | null {
  const normalized = String(value || '').trim().toLowerCase();
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
  const normalized = String(status || '').trim().toLowerCase();
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

function resolveSubscriptionStatusLabel(status: SubscriptionStatus) {
  if (status === 'trialing') {
    return 'En prueba';
  }

  if (status === 'past_due') {
    return 'Pago pendiente';
  }

  if (status === 'cancelled') {
    return 'Cancelado';
  }

  return 'Activo';
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
    <article className="data-card rounded-[1.7rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-ink dark:text-slate-100">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{detail}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-white/65 bg-white/70 text-ink shadow-[0_16px_28px_-22px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

export default async function AdminBarbershopSettingsPage({
  searchParams,
}: AdminBarbershopSettingsPageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const supabase = await createSupabaseServerClient();

  const [{ data: shop }, { data: location }, { data: gallery }, { data: subscription }, paymentAccount] =
    await Promise.all([
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
  const currentStatus = resolveCurrentStatus(subscriptionData?.status);
  const billingMessage = resolveBillingMessage(params.billing);
  const paymentsMessage = resolvePaymentsMessage(params.payments);
  const currentPlanDescriptor = getSubscriptionPlanDescriptor(currentPlan);
  const publicProfileHref = buildShopHref(shopData?.slug || ctx.shopSlug);
  const publicBookingsHref = buildShopHref(shopData?.slug || ctx.shopSlug, 'book');
  const profileScore = getProfileCompletionScore({
    description: shopData?.description || null,
    location: locationData,
    galleryCount: galleryRows.length,
    phone: shopData?.phone || null,
  });
  const isPaymentsReady = Boolean(paymentAccount?.isActive && paymentAccount?.status === 'connected');
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
      detail: 'Dominio, Mercado Pago y plan en una columna separada del formulario.',
    },
  ];

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)] xl:items-end">
          <div>
            <p className="hero-eyebrow">Configuracion del local</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              {ctx.shopName}: perfil, reservas y cobros
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate/80 dark:text-slate-300">
              Reorganizamos esta pantalla para separar lo que ve el cliente de la configuracion
              operativa y comercial. El perfil publico vive arriba del flujo, y dominio, pagos y
              suscripcion quedan en su propio carril.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={publicProfileHref}
                target="_blank"
                rel="noreferrer"
                className="action-primary inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold no-underline"
              >
                Ver perfil publico
              </Link>
              <Link
                href={publicBookingsHref}
                target="_blank"
                rel="noreferrer"
                className="action-secondary inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold no-underline"
              >
                Abrir reservas
              </Link>
              <Link
                href={buildAdminHref('/admin', ctx.shopSlug)}
                className="action-secondary inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold no-underline"
              >
                Volver al panel
              </Link>
            </div>
          </div>

          <div className="surface-card rounded-[1.8rem] p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Nueva estructura
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {layoutZones.map((zone) => (
                <div
                  key={zone.title}
                  className="rounded-[1.35rem] border border-white/65 bg-white/52 p-4 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">
                    {zone.title}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate/80 dark:text-slate-300">
                    {zone.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
          label="Plan"
          value={currentPlanDescriptor.name}
          detail={`${resolveSubscriptionStatusLabel(currentStatus)} - ${isPaymentsReady ? 'Mercado Pago listo' : 'Cobros pendientes'}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
        <Card className="soft-panel rounded-[1.95rem] border-0 shadow-none">
          <CardBody className="space-y-5 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="hero-eyebrow">Perfil y operacion</p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
                  Lo que define tu storefront
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-slate/80 dark:text-slate-300">
                  Nombre, slug, fotos, ubicacion y politicas visibles para clientes. Todo lo que
                  impacta la lectura del perfil publico y el flujo de reserva se edita aqui.
                </p>
              </div>
              <span
                className="meta-chip"
                data-tone={profileScore.completed >= 4 ? 'success' : undefined}
              >
                {profileScore.completed}/{profileScore.total} listo
              </span>
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

        <div className="space-y-4">
          <div className="soft-panel rounded-[1.9rem] px-5 py-5 md:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-white/65 bg-white/70 text-ink shadow-[0_16px_28px_-22px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="hero-eyebrow">Comercial y canales</p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
                  Dominio, pagos y plan
                </h2>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Esta columna separa la capa comercial del perfil publico para que la pagina no se
                  lea como un unico formulario gigante.
                </p>
              </div>
            </div>
          </div>

          <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
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

          <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
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

          <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
            <CardBody className="space-y-5 p-5 md:p-6">
              <div>
                <p className="hero-eyebrow">Facturacion</p>
                <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold text-ink dark:text-slate-100">
                  Plan y checkout
                </h3>
                <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                  Cambia o renueva tu suscripcion desde aqui sin mezclarlo con la edicion del
                  storefront.
                </p>
              </div>

              <SubscriptionBillingPanel
                shopId={ctx.shopId}
                currentPlan={currentPlan}
                currentStatus={currentStatus}
                billingMessage={billingMessage}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
