import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCustomDomainProvider } from '@/lib/custom-domain-provider';
import {
  normalizeCustomDomain,
  validateCustomDomainActivation,
  validateCustomDomainAssignment,
} from '@/lib/custom-domains';
import { getPlatformHostConfig } from '@/lib/platform-host-config';
import { readSanitizedJsonBody } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const customDomainPayloadSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('save'),
    shop_id: z.string().uuid(),
    custom_domain: z.string().trim().min(1).max(255),
  }),
  z.object({
    action: z.literal('activate'),
    shop_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal('remove'),
    shop_id: z.string().uuid(),
  }),
]);

interface ShopRow {
  id: string;
  slug: string;
  status: string;
  custom_domain: string | null;
  domain_status: string | null;
  domain_verified_at: string | null;
}

interface SubscriptionRow {
  plan: string | null;
  status: string | null;
}

function revalidateShopSurface(shopSlug: string) {
  revalidatePath('/admin/barbershop');
  revalidatePath('/suscripcion');
  revalidatePath(`/shops/${shopSlug}`);
  revalidatePath(`/shops/${shopSlug}/book`);
  revalidatePath(`/shops/${shopSlug}/jobs`);
  revalidatePath(`/shops/${shopSlug}/courses`);
  revalidatePath(`/shops/${shopSlug}/modelos`);
  revalidatePath(`/shops/${shopSlug}/modelos/registro`);
}

function toResponse(shop: ShopRow, subscription: SubscriptionRow | null, message: string | null) {
  return NextResponse.json({
    shop_id: shop.id,
    shop_slug: shop.slug,
    plan: String(subscription?.plan || 'free'),
    custom_domain: shop.custom_domain,
    domain_status: shop.domain_status,
    domain_verified_at: shop.domain_verified_at,
    message,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Debes iniciar sesion para gestionar el dominio.', { status: 401 });
  }

  const body = await readSanitizedJsonBody(request);
  const parsed = customDomainPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse(
      parsed.error.flatten().formErrors.join(', ') || 'Datos de dominio invalidos.',
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const payload = parsed.data;

  const { data: membership, error: membershipError } = await admin
    .from('shop_memberships')
    .select('id')
    .eq('shop_id', payload.shop_id)
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .eq('membership_status', 'active')
    .maybeSingle();

  if (membershipError || !membership) {
    return new NextResponse('No tienes permisos para gestionar el dominio de esta barberia.', {
      status: 403,
    });
  }

  const [{ data: shopData, error: shopError }, { data: subscriptionData }] = await Promise.all([
    admin
      .from('shops')
      .select('id, slug, status, custom_domain, domain_status, domain_verified_at')
      .eq('id', payload.shop_id)
      .maybeSingle(),
    admin.from('subscriptions').select('plan, status').eq('shop_id', payload.shop_id).maybeSingle(),
  ]);

  if (shopError || !shopData) {
    return new NextResponse('No encontramos la barberia a configurar.', { status: 404 });
  }

  const shop = shopData as ShopRow;
  const subscription = (subscriptionData as SubscriptionRow | null) || null;
  const currentPlan = String(subscription?.plan || 'free');

  if (payload.action !== 'remove' && shop.status !== 'active') {
    return new NextResponse(
      'Solo las barberias activas pueden guardar o activar un dominio personalizado.',
      { status: 400 },
    );
  }

  if (payload.action === 'save') {
    const normalizedCurrentDomain = normalizeCustomDomain(String(shop.custom_domain || ''));
    const normalizedRequestedDomain = normalizeCustomDomain(payload.custom_domain);

    const { data: duplicateDomainOwner } =
      normalizedRequestedDomain && normalizedRequestedDomain !== normalizedCurrentDomain
        ? await admin
            .from('shops')
            .select('id')
            .eq('custom_domain', normalizedRequestedDomain)
            .neq('id', shop.id)
            .maybeSingle()
        : { data: null as { id: string } | null };

    const validation = validateCustomDomainAssignment({
      requestedDomain: payload.custom_domain,
      currentShopId: shop.id,
      currentPlan,
      existingDomainOwnerShopId: duplicateDomainOwner?.id || null,
      config: getPlatformHostConfig(),
    });

    if (!validation.ok || !validation.normalizedDomain) {
      return new NextResponse(validation.message || 'No se pudo guardar el dominio.', {
        status: currentPlan === 'business' ? 400 : 403,
      });
    }

    if (validation.normalizedDomain === normalizedCurrentDomain && shop.domain_status) {
      return toResponse(shop, subscription, 'Ese dominio ya esta guardado.');
    }

    const provider = getCustomDomainProvider();
    const providerResult = await provider.prepare({
      shopId: shop.id,
      shopSlug: shop.slug,
      domain: validation.normalizedDomain,
    });

    const { data: updatedShop, error: updateError } = await admin
      .from('shops')
      .update({
        custom_domain: validation.normalizedDomain,
        domain_status: providerResult.status,
        domain_verified_at: null,
      })
      .eq('id', shop.id)
      .select('id, slug, status, custom_domain, domain_status, domain_verified_at')
      .single();

    if (updateError || !updatedShop) {
      return new NextResponse(updateError?.message || 'No se pudo guardar el dominio.', {
        status: 400,
      });
    }

    revalidateShopSurface(shop.slug);
    return toResponse(updatedShop as ShopRow, subscription, providerResult.message);
  }

  if (payload.action === 'activate') {
    const activationMessage = validateCustomDomainActivation({
      currentPlan,
      currentDomain: shop.custom_domain,
    });

    if (activationMessage) {
      return new NextResponse(activationMessage, {
        status: currentPlan === 'business' ? 400 : 403,
      });
    }

    const currentDomain = normalizeCustomDomain(String(shop.custom_domain || ''));
    if (!currentDomain) {
      return new NextResponse('Primero guarda un dominio valido.', { status: 400 });
    }

    const provider = getCustomDomainProvider();
    const providerResult = await provider.verify({
      shopId: shop.id,
      shopSlug: shop.slug,
      domain: currentDomain,
    });

    const nextStatus = providerResult.status === 'failed' ? 'failed' : 'active';
    const nextVerifiedAt = nextStatus === 'active' ? new Date().toISOString() : null;

    const { data: updatedShop, error: updateError } = await admin
      .from('shops')
      .update({
        custom_domain: currentDomain,
        domain_status: nextStatus,
        domain_verified_at: nextVerifiedAt,
      })
      .eq('id', shop.id)
      .select('id, slug, status, custom_domain, domain_status, domain_verified_at')
      .single();

    if (updateError || !updatedShop) {
      return new NextResponse(updateError?.message || 'No se pudo activar el dominio.', {
        status: 400,
      });
    }

    revalidateShopSurface(shop.slug);
    if (nextStatus === 'failed') {
      return new NextResponse(
        providerResult.message || 'La verificacion del dominio no se pudo completar.',
        { status: 400 },
      );
    }

    return toResponse(updatedShop as ShopRow, subscription, providerResult.message);
  }

  if (shop.custom_domain) {
    const provider = getCustomDomainProvider();
    await provider.release({
      shopId: shop.id,
      shopSlug: shop.slug,
      domain: shop.custom_domain,
    });
  }

  const { data: updatedShop, error: removeError } = await admin
    .from('shops')
    .update({
      custom_domain: null,
      domain_status: null,
      domain_verified_at: null,
    })
    .eq('id', shop.id)
    .select('id, slug, status, custom_domain, domain_status, domain_verified_at')
    .single();

  if (removeError || !updatedShop) {
    return new NextResponse(removeError?.message || 'No se pudo eliminar el dominio.', {
      status: 400,
    });
  }

  revalidateShopSurface(shop.slug);
  return toResponse(updatedShop as ShopRow, subscription, 'Dominio eliminado correctamente.');
}
