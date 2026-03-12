import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { appendSubscriptionBillingMessage } from '@navaja/shared';
import { env } from '@/lib/env';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { getMercadoPagoServerEnv } from '@/lib/env.server';
import { createMercadoPagoCheckoutPreference } from '@/lib/mercado-pago.server';
import {
  getSubscriptionPlanDescriptor,
  getSubscriptionPriceCents,
  type SubscriptionBillingMode,
  type SubscriptionTier,
} from '@/lib/subscription-plans';
import { trackProductEvent } from '@/lib/product-analytics';
import { readSanitizedJsonBody } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const subscriptionCheckoutSchema = z.object({
  shop_id: z.string().uuid(),
  target_plan: z.enum(['pro', 'business']),
  billing_mode: z.enum(['monthly', 'annual_installments']),
  return_to: z.string().trim().max(2000).optional().nullable(),
});

function resolveCheckoutReturnBaseUrl(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  try {
    const candidate = new URL(normalized);
    if (
      candidate.protocol === 'navajastaff:' ||
      candidate.protocol === 'exp:' ||
      candidate.protocol === 'exps:'
    ) {
      return candidate.toString();
    }

    const appUrl = new URL(env.NEXT_PUBLIC_APP_URL);
    if (candidate.origin === appUrl.origin) {
      return candidate.toString();
    }
  } catch {
    return null;
  }

  return null;
}

async function canManageShopSubscription(shopId: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: ownedShop }, { data: membership }, { data: staffAdmin }] = await Promise.all([
    admin
      .from('shops')
      .select('id')
      .eq('id', shopId)
      .eq('owner_user_id', userId)
      .maybeSingle(),
    admin
      .from('shop_memberships')
      .select('id')
      .eq('shop_id', shopId)
      .eq('user_id', userId)
      .eq('membership_status', 'active')
      .in('role', ['owner', 'admin'])
      .maybeSingle(),
    admin
      .from('staff')
      .select('id')
      .eq('shop_id', shopId)
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .eq('role', 'admin')
      .maybeSingle(),
  ]);

  return Boolean(ownedShop?.id || membership?.id || staffAdmin?.id);
}

export async function POST(request: NextRequest) {
  const body = await readSanitizedJsonBody(request);
  const parsed = subscriptionCheckoutSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse(parsed.error.flatten().formErrors.join(', ') || 'Datos invalidos.', {
      status: 400,
    });
  }

  const user = await resolveAuthenticatedUser(request);
  if (!user) {
    return new NextResponse('Debes iniciar sesion para continuar.', { status: 401 });
  }

  const canManageShop = await canManageShopSubscription(parsed.data.shop_id, user.id);
  if (!canManageShop) {
    return new NextResponse('No tienes permisos para gestionar esta suscripcion.', { status: 403 });
  }

  const targetPlan = parsed.data.target_plan as SubscriptionTier;
  const billingMode = parsed.data.billing_mode as SubscriptionBillingMode;
  const amountCents = getSubscriptionPriceCents(targetPlan, billingMode);

  if (amountCents <= 0) {
    return new NextResponse('Ese plan no requiere pago. Usa el switch de plan directamente.', {
      status: 400,
    });
  }

  const admin = createSupabaseAdminClient();
  const { data: shop } = await admin
    .from('shops')
    .select('id, name, slug')
    .eq('id', parsed.data.shop_id)
    .maybeSingle();

  if (!shop?.id) {
    return new NextResponse('No encontramos la barberia seleccionada.', { status: 404 });
  }

  const returnBaseUrl = parsed.data.return_to
    ? resolveCheckoutReturnBaseUrl(parsed.data.return_to)
    : null;
  if (parsed.data.return_to && !returnBaseUrl) {
    return new NextResponse('La URL de retorno no es valida.', { status: 400 });
  }

  const subscriptionReturnBaseUrl = returnBaseUrl || `${env.NEXT_PUBLIC_APP_URL}/suscripcion`;

  const externalReference = [
    'subscription',
    parsed.data.shop_id.slice(0, 8),
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join('-');

  const { data: paymentIntent, error: intentError } = await admin
    .from('payment_intents')
    .insert({
      shop_id: parsed.data.shop_id,
      intent_type: 'subscription',
      status: 'pending',
      provider: 'mercado_pago',
      external_reference: externalReference,
      amount_cents: amountCents,
      currency_code: 'UYU',
      payer_email: user.email || null,
      payload: {
        shop_id: parsed.data.shop_id,
        shop_slug: shop.slug,
        target_plan: targetPlan,
        billing_mode: billingMode,
        requested_by_user_id: user.id,
      },
      created_by_user_id: user.id,
    })
    .select('id')
    .single();

  if (intentError || !paymentIntent) {
    return new NextResponse(intentError?.message || 'No se pudo iniciar el checkout.', { status: 400 });
  }

  const descriptor = getSubscriptionPlanDescriptor(targetPlan);
  const source = request.headers.get('authorization') ? 'mobile' : 'web';

  void trackProductEvent({
    eventName: 'subscription.checkout_submitted',
    shopId: parsed.data.shop_id,
    userId: user.id,
    source,
    metadata: {
      target_plan: targetPlan,
      billing_mode: billingMode,
      amount_cents: amountCents,
      payment_intent_id: String(paymentIntent.id),
    },
  });

  try {
    const mercadoPagoEnv = getMercadoPagoServerEnv();
    const webhookToken = mercadoPagoEnv.MERCADO_PAGO_WEBHOOK_TOKEN?.trim() || null;
    if (!webhookToken) {
      throw new Error('Falta configurar MERCADO_PAGO_WEBHOOK_TOKEN para habilitar pagos.');
    }
    const webhookSecret = mercadoPagoEnv.MERCADO_PAGO_WEBHOOK_SECRET?.trim() || null;
    if (!webhookSecret) {
      throw new Error('Falta configurar MERCADO_PAGO_WEBHOOK_SECRET para habilitar pagos.');
    }
    const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/payments/mercadopago/webhook?token=${encodeURIComponent(webhookToken)}`;

    const checkout = await createMercadoPagoCheckoutPreference({
      item: {
        id: `${targetPlan}-${billingMode}`,
        title: `Suscripcion ${descriptor.name} - ${shop.name}`,
        description: `Plan ${descriptor.name} para ${shop.name}`,
        amountCents,
      },
      payerEmail: user.email || null,
      externalReference,
      successUrl: appendSubscriptionBillingMessage(subscriptionReturnBaseUrl, 'success', shop.slug),
      pendingUrl: appendSubscriptionBillingMessage(subscriptionReturnBaseUrl, 'pending', shop.slug),
      failureUrl: appendSubscriptionBillingMessage(subscriptionReturnBaseUrl, 'failure', shop.slug),
      notificationUrl: webhookUrl,
      metadata: {
        intent_id: String(paymentIntent.id),
        intent_type: 'subscription',
        shop_id: parsed.data.shop_id,
        target_plan: targetPlan,
        billing_mode: billingMode,
      },
    });

    await admin
      .from('payment_intents')
      .update({
        provider_preference_id: checkout.preferenceId,
        checkout_url: checkout.checkoutUrl,
      })
      .eq('id', paymentIntent.id);

    void trackProductEvent({
      eventName: 'subscription.checkout_created',
      shopId: parsed.data.shop_id,
      userId: user.id,
      source,
      metadata: {
        target_plan: targetPlan,
        billing_mode: billingMode,
        payment_intent_id: String(paymentIntent.id),
      },
    });

    return NextResponse.json({
      payment_intent_id: paymentIntent.id,
      checkout_url: checkout.checkoutUrl,
      requires_payment: true,
    });
  } catch (checkoutError) {
    await admin
      .from('payment_intents')
      .update({
        status: 'rejected',
        failure_reason:
          checkoutError instanceof Error ? checkoutError.message : 'No se pudo crear el checkout.',
      })
      .eq('id', paymentIntent.id);

    return new NextResponse(
      checkoutError instanceof Error ? checkoutError.message : 'No se pudo iniciar el checkout.',
      { status: 400 },
    );
  }
}
