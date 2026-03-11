import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
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
import { createSupabaseServerClient } from '@/lib/supabase/server';

const subscriptionCheckoutSchema = z.object({
  shop_id: z.string().uuid(),
  target_plan: z.enum(['pro', 'business']),
  billing_mode: z.enum(['monthly', 'annual_installments']),
});

export async function POST(request: NextRequest) {
  const body = await readSanitizedJsonBody(request);
  const parsed = subscriptionCheckoutSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse(parsed.error.flatten().formErrors.join(', ') || 'Datos invalidos.', {
      status: 400,
    });
  }

  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  if (!user) {
    return new NextResponse('Debes iniciar sesion para continuar.', { status: 401 });
  }

  const { data: canManageShop } = await sessionSupabase.rpc('is_shop_admin', {
    _shop_id: parsed.data.shop_id,
  });

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

  void trackProductEvent({
    eventName: 'subscription.checkout_submitted',
    shopId: parsed.data.shop_id,
    userId: user.id,
    source: 'web',
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
      successUrl: `${env.NEXT_PUBLIC_APP_URL}/suscripcion?shop=${encodeURIComponent(shop.slug)}&billing=success`,
      pendingUrl: `${env.NEXT_PUBLIC_APP_URL}/suscripcion?shop=${encodeURIComponent(shop.slug)}&billing=pending`,
      failureUrl: `${env.NEXT_PUBLIC_APP_URL}/suscripcion?shop=${encodeURIComponent(shop.slug)}&billing=failure`,
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
      source: 'web',
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
