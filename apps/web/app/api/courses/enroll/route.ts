import { NextResponse, type NextRequest } from 'next/server';
import { courseEnrollmentCreateSchema } from '@navaja/shared';
import { resolveAuthenticatedUser } from '@/lib/api-auth';
import { resolveShopTierForUser } from '@/lib/billing.server';
import { createCourseEnrollmentFromIntent } from '@/lib/course-payments.server';
import { env } from '@/lib/env';
import { getMercadoPagoServerEnv } from '@/lib/env.server';
import { createMercadoPagoCheckoutPreference } from '@/lib/mercado-pago.server';
import { trackProductEvent } from '@/lib/product-analytics';
import { readSanitizedJsonBody, sanitizeText } from '@/lib/sanitize';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function normalizeEmail(value: string | null | undefined) {
  return sanitizeText(value, { lowercase: true }) || null;
}

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

export async function POST(request: NextRequest) {
  const body = await readSanitizedJsonBody(request);
  const parsed = courseEnrollmentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return new NextResponse(parsed.error.flatten().formErrors.join(', ') || 'Datos de inscripcion invalidos.', {
      status: 400,
    });
  }

  const user = await resolveAuthenticatedUser(request);
  const supabase = createSupabaseAdminClient();
  const returnBaseUrl = resolveCheckoutReturnBaseUrl(
    typeof body === 'object' && body !== null && 'return_to' in body
      ? String((body as { return_to?: unknown }).return_to || '')
      : null,
  );

  if (
    typeof body === 'object' &&
    body !== null &&
    'return_to' in body &&
    (body as { return_to?: unknown }).return_to &&
    !returnBaseUrl
  ) {
    return new NextResponse('La URL de retorno no es valida.', { status: 400 });
  }

  const normalizedEmail =
    normalizeEmail(parsed.data.email) ?? normalizeEmail(user?.email) ?? null;
  const normalizedPhone = sanitizeText(parsed.data.phone) || '';
  const normalizedName = sanitizeText(parsed.data.name) || '';

  if (!normalizedEmail) {
    return new NextResponse('Ingresa un email valido para completar la inscripcion.', {
      status: 400,
    });
  }

  const { data: session, error: sessionError } = await supabase
    .from('course_sessions')
    .select('id, course_id, capacity, status')
    .eq('id', parsed.data.session_id)
    .eq('status', 'scheduled')
    .maybeSingle();

  if (sessionError) {
    return new NextResponse(sessionError.message || 'No se pudo validar la sesion.', { status: 400 });
  }

  if (!session?.id || !session.course_id) {
    return new NextResponse('La sesion seleccionada no esta disponible.', { status: 400 });
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, shop_id, title, price_cents, is_active')
    .eq('id', String(session.course_id))
    .eq('is_active', true)
    .maybeSingle();

  if (courseError) {
    return new NextResponse(courseError.message || 'No se pudo validar el curso.', { status: 400 });
  }

  if (!course?.id || !course.shop_id) {
    return new NextResponse('El curso ya no esta disponible para inscripcion.', { status: 400 });
  }

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id, name, slug, status')
    .eq('id', String(course.shop_id))
    .eq('status', 'active')
    .maybeSingle();

  if (shopError) {
    return new NextResponse(shopError.message || 'No se pudo validar la barberia.', { status: 400 });
  }

  if (!shop?.id) {
    return new NextResponse('La barberia de este curso no esta disponible.', { status: 400 });
  }

  const [{ count: activeEnrollmentCount, error: countError }, { data: duplicateEnrollment, error: duplicateError }] =
    await Promise.all([
      supabase
        .from('course_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', parsed.data.session_id)
        .in('status', ['pending', 'confirmed']),
      supabase
        .from('course_enrollments')
        .select('id, status')
        .eq('session_id', parsed.data.session_id)
        .eq('email', normalizedEmail)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (countError) {
    return new NextResponse(countError.message || 'No se pudo validar la capacidad del curso.', {
      status: 400,
    });
  }

  if (duplicateError) {
    return new NextResponse(duplicateError.message || 'No se pudo validar si ya estabas inscripto.', {
      status: 400,
    });
  }

  if (duplicateEnrollment?.id) {
    return new NextResponse('Ya existe una inscripcion activa para este email en la sesion.', {
      status: 400,
    });
  }

  const capacity = Number(session.capacity || 0);
  if (capacity > 0 && (activeEnrollmentCount || 0) >= capacity) {
    return new NextResponse('Esta sesion ya no tiene cupos disponibles.', { status: 400 });
  }

  const amountCents = Number(course.price_cents || 0);
  const tierResolution = await resolveShopTierForUser(String(course.shop_id), user?.id ?? null);
  const requiresPayment = amountCents > 0 && tierResolution.requiresReservationPayment;

  void trackProductEvent({
    eventName: 'course.enrollment_submitted',
    shopId: String(course.shop_id),
    userId: user?.id || null,
    source: 'api',
    metadata: {
      course_id: String(course.id),
      session_id: String(session.id),
      requires_payment: requiresPayment,
    },
  });

  if (requiresPayment) {
    const externalReference = [
      'course',
      parsed.data.session_id.slice(0, 8),
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 10),
    ].join('-');

    const { data: paymentIntent, error: paymentIntentError } = await supabase
      .from('payment_intents')
      .insert({
        shop_id: String(course.shop_id),
        intent_type: 'course_enrollment',
        status: 'pending',
        provider: 'mercado_pago',
        external_reference: externalReference,
        amount_cents: amountCents,
        currency_code: 'UYU',
        payer_email: normalizedEmail,
        payload: {
          shop_id: String(course.shop_id),
          shop_slug: String(shop.slug || ''),
          course_id: String(course.id),
          course_title: String(course.title || 'Curso'),
          session_id: String(session.id),
          customer_name: normalizedName,
          customer_phone: normalizedPhone,
          customer_email: normalizedEmail,
        },
        created_by_user_id: user?.id || null,
      })
      .select('id')
      .single();

    if (paymentIntentError || !paymentIntent) {
      return new NextResponse(paymentIntentError?.message || 'No se pudo iniciar el pago.', {
        status: 400,
      });
    }

    const paymentStateParams = new URLSearchParams({
      payment_intent: String(paymentIntent.id),
      course: String(course.id),
      session: String(session.id),
      shop: String(shop.slug || ''),
      title: String(course.title || 'Curso'),
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
      const successBaseUrl = returnBaseUrl || `${env.NEXT_PUBLIC_APP_URL}/courses/enrollment/success`;

      const checkout = await createMercadoPagoCheckoutPreference({
        item: {
          id: String(session.id),
          title: `Inscripcion curso - ${String(course.title || 'Curso')}`,
          description: `Cupo para ${String(course.title || 'Curso')} en ${String(shop.name || 'barberia')}`,
          amountCents,
        },
        payerEmail: normalizedEmail,
        externalReference,
        successUrl: `${successBaseUrl}?${paymentStateParams.toString()}&payment_status=approved`,
        pendingUrl: `${successBaseUrl}?${paymentStateParams.toString()}&payment_status=pending`,
        failureUrl: `${successBaseUrl}?${paymentStateParams.toString()}&payment_status=failure`,
        notificationUrl: webhookUrl,
        metadata: {
          intent_id: String(paymentIntent.id),
          intent_type: 'course_enrollment',
          course_id: String(course.id),
          session_id: String(session.id),
          shop_id: String(course.shop_id),
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
        eventName: 'course.enrollment_checkout_created',
        shopId: String(course.shop_id),
        userId: user?.id || null,
        source: 'api',
        metadata: {
          payment_intent_id: String(paymentIntent.id),
          course_id: String(course.id),
          session_id: String(session.id),
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
    const enrollment = await createCourseEnrollmentFromIntent(
      {
        shop_id: String(course.shop_id),
        course_id: String(course.id),
        course_title: String(course.title || 'Curso'),
        session_id: parsed.data.session_id,
        name: normalizedName,
        phone: normalizedPhone,
        email: normalizedEmail,
      },
      { paymentIntentId: null },
    );

    void trackProductEvent({
      eventName: 'course.enrollment_created',
      shopId: String(course.shop_id),
      userId: user?.id || null,
      source: 'api',
      metadata: {
        enrollment_id: enrollment.enrollmentId,
        course_id: String(course.id),
        session_id: String(session.id),
      },
    });

    return NextResponse.json({
      enrollment_id: enrollment.enrollmentId,
      requires_payment: false,
    });
  } catch (createError) {
    return new NextResponse(
      createError instanceof Error ? createError.message : 'No se pudo registrar la inscripcion.',
      { status: 400 },
    );
  }
}
