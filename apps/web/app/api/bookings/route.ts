import { NextResponse, type NextRequest } from 'next/server';
import { bookingInputSchema } from '@navaja/shared';
import { createAppointmentFromBookingIntent } from '@/lib/booking-payments.server';
import { env } from '@/lib/env';
import { getMercadoPagoServerEnv } from '@/lib/env.server';
import { createMercadoPagoCheckoutPreference } from '@/lib/mercado-pago.server';
import { trackProductEvent } from '@/lib/product-analytics';
import { getRequestOrigin } from '@/lib/request-origin';
import { readSanitizedJsonBody, sanitizeText } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function normalizeEmail(value: string | null | undefined) {
  return sanitizeText(value, { lowercase: true }) || null;
}

function resolveRequestedSourceChannel(value: unknown) {
  return value === 'MOBILE' ? 'MOBILE' : 'WEB';
}

function isMercadoPagoTestMode(accessToken: string | null | undefined) {
  return String(accessToken || '').trim().toUpperCase().startsWith('TEST-');
}

function isMercadoPagoTestEmail(email: string | null | undefined) {
  return String(email || '').trim().toLowerCase().endsWith('@testuser.com');
}

export async function POST(request: NextRequest) {
  const body = await readSanitizedJsonBody(request);
  const parsed = bookingInputSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse(parsed.error.flatten().formErrors.join(', ') || 'Datos de reserva invalidos.', {
      status: 400,
    });
  }

  if (!parsed.data.staff_id) {
    return new NextResponse('Selecciona un horario valido con barbero asignado.', { status: 400 });
  }

  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  const resolvedCustomerEmail =
    normalizeEmail(parsed.data.customer_email) ?? normalizeEmail(user?.email) ?? null;
  const requestedSourceChannel = resolveRequestedSourceChannel(parsed.data.source_channel);

  const supabase = createSupabaseAdminClient();

  const [{ data: shop }, { data: service }, { data: staffMember }] = await Promise.all([
    supabase
      .from('shops')
      .select('id, status')
      .eq('id', parsed.data.shop_id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('services')
      .select('id, name, price_cents')
      .eq('id', parsed.data.service_id)
      .eq('shop_id', parsed.data.shop_id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('staff')
      .select('id, name')
      .eq('id', parsed.data.staff_id)
      .eq('shop_id', parsed.data.shop_id)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (!shop) {
    return new NextResponse('La barbershop seleccionada no esta disponible.', { status: 400 });
  }

  if (!service) {
    return new NextResponse('El servicio seleccionado no esta disponible.', { status: 400 });
  }

  if (!staffMember) {
    return new NextResponse('El barbero seleccionado no esta disponible.', { status: 400 });
  }

  const amountCents = Number((service as { price_cents?: number } | null)?.price_cents || 0);
  const requiresOnlinePayment = !parsed.data.pay_in_store && amountCents > 0;
  const eventSource = requestedSourceChannel === 'MOBILE' ? 'mobile' : 'web';

  void trackProductEvent({
    eventName: 'booking.submitted',
    shopId: parsed.data.shop_id,
    userId: user?.id || null,
    source: eventSource,
    metadata: {
      service_id: parsed.data.service_id,
      staff_id: parsed.data.staff_id,
      pay_in_store: parsed.data.pay_in_store,
      amount_cents: amountCents,
      requires_payment: requiresOnlinePayment,
    },
  });

  if (requiresOnlinePayment) {
    if (!resolvedCustomerEmail) {
      return new NextResponse('Para completar el pago necesitas ingresar un email valido.', {
        status: 400,
      });
    }

    const externalReference = [
      'booking',
      parsed.data.shop_id.slice(0, 8),
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 10),
    ].join('-');
    const serviceName = String((service as { name?: string } | null)?.name || 'Servicio');
    const staffName = String((staffMember as { name?: string } | null)?.name || 'Barbero');

    const paymentPayload = {
      shop_id: parsed.data.shop_id,
      service_id: parsed.data.service_id,
      staff_id: parsed.data.staff_id,
      start_at: parsed.data.start_at,
      source_channel: requestedSourceChannel,
      pay_in_store: false,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      customer_email: resolvedCustomerEmail,
      notes: parsed.data.notes || null,
      service_name: serviceName,
      staff_name: staffName,
      created_by_user_email: normalizeEmail(user?.email),
    };

    const { data: paymentIntent, error: paymentIntentError } = await supabase
      .from('payment_intents')
      .insert({
        shop_id: parsed.data.shop_id,
        intent_type: 'booking',
        status: 'pending',
        provider: 'mercado_pago',
        external_reference: externalReference,
        amount_cents: amountCents,
        currency_code: 'UYU',
        payer_email: resolvedCustomerEmail,
        payload: paymentPayload,
        created_by_user_id: user?.id || null,
      })
      .select('id')
      .single();

    if (paymentIntentError || !paymentIntent) {
      return new NextResponse(paymentIntentError?.message || 'No se pudo iniciar el pago.', {
        status: 400,
      });
    }

    const bookingStateParams = new URLSearchParams({
      payment_intent: String(paymentIntent.id),
      service: serviceName,
      staff: staffName,
      start: parsed.data.start_at,
    });

    try {
      const mercadoPagoEnv = getMercadoPagoServerEnv();
      const isTestMode = isMercadoPagoTestMode(mercadoPagoEnv.MERCADO_PAGO_ACCESS_TOKEN);
      if (isTestMode && !isMercadoPagoTestEmail(resolvedCustomerEmail)) {
        return new NextResponse(
          'En modo prueba de Mercado Pago debes usar un email de comprador test (@testuser.com).',
          { status: 400 },
        );
      }
      const webhookToken = mercadoPagoEnv.MERCADO_PAGO_WEBHOOK_TOKEN?.trim() || null;
      if (!webhookToken) {
        throw new Error('Falta configurar MERCADO_PAGO_WEBHOOK_TOKEN para habilitar pagos.');
      }
      const webhookSecret = mercadoPagoEnv.MERCADO_PAGO_WEBHOOK_SECRET?.trim() || null;
      if (!webhookSecret) {
        throw new Error('Falta configurar MERCADO_PAGO_WEBHOOK_SECRET para habilitar pagos.');
      }
      const requestOrigin = getRequestOrigin(request);
      const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/payments/mercadopago/webhook?token=${encodeURIComponent(webhookToken)}`;

      const checkout = await createMercadoPagoCheckoutPreference({
        item: {
          id: parsed.data.service_id,
          title: `Reserva - ${serviceName}`,
          description: `Reserva en barbershop ${parsed.data.shop_id.slice(0, 8)}`,
          amountCents,
        },
        payerEmail: isTestMode ? null : resolvedCustomerEmail,
        externalReference,
        successUrl: `${requestOrigin}/book/success?${bookingStateParams.toString()}&payment_status=approved`,
        pendingUrl: `${requestOrigin}/book/success?${bookingStateParams.toString()}&payment_status=pending`,
        failureUrl: `${requestOrigin}/book/success?${bookingStateParams.toString()}&payment_status=failure`,
        notificationUrl: webhookUrl,
        metadata: {
          intent_id: String(paymentIntent.id),
          intent_type: 'booking',
        },
      });

      await supabase
        .from('payment_intents')
        .update({
          provider_preference_id: checkout.preferenceId,
          checkout_url: checkout.checkoutUrl,
        })
        .eq('id', paymentIntent.id);

      void trackProductEvent({
        eventName: 'booking.payment_checkout_created',
        shopId: parsed.data.shop_id,
        userId: user?.id || null,
        source: eventSource,
        metadata: {
          payment_intent_id: String(paymentIntent.id),
          service_id: parsed.data.service_id,
        },
      });

      return NextResponse.json({
        requires_payment: true,
        payment_intent_id: paymentIntent.id,
        checkout_url: checkout.checkoutUrl,
      });
    } catch (checkoutError) {
      await supabase
        .from('payment_intents')
        .update({
          status: 'rejected',
          failure_reason:
            checkoutError instanceof Error ? checkoutError.message : 'No se pudo crear el checkout.',
        })
        .eq('id', paymentIntent.id);

      return new NextResponse(
        checkoutError instanceof Error ? checkoutError.message : 'No se pudo iniciar el pago.',
        { status: 400 },
      );
    }
  }

  try {
    const appointment = await createAppointmentFromBookingIntent({
      shop_id: parsed.data.shop_id,
      service_id: parsed.data.service_id,
      staff_id: parsed.data.staff_id,
      start_at: parsed.data.start_at,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      customer_email: resolvedCustomerEmail,
      notes: parsed.data.notes || null,
    }, {
      sourceChannel: requestedSourceChannel,
      customerAuthUserId: user?.id || null,
      customerAuthUserEmail: user?.email || null,
    });

    void trackProductEvent({
      eventName: 'booking.created',
      shopId: parsed.data.shop_id,
      userId: user?.id || null,
      customerId: appointment.customerId,
      source: eventSource,
      metadata: {
        appointment_id: appointment.appointmentId,
        service_id: parsed.data.service_id,
      },
    });

    return NextResponse.json({
      appointment_id: appointment.appointmentId,
      start_at: appointment.startAt,
      requires_payment: false,
    });
  } catch (createError) {
    return new NextResponse(
      createError instanceof Error ? createError.message : 'No se pudo crear la cita.',
      { status: 400 },
    );
  }
}

