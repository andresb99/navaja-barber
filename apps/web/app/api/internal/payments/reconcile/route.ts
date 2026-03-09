import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPaymentOpsEnv } from '@/lib/env.server';
import { reconcileMercadoPagoPaymentIntents } from '@/lib/payment-intents.server';

const reconcileQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  shop_id: z.string().uuid().optional(),
});

function getBearerToken(request: NextRequest) {
  const raw = request.headers.get('authorization') || '';
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isAuthorized(request: NextRequest) {
  const secret = getPaymentOpsEnv().PAYMENT_RECONCILE_CRON_SECRET;
  const bearer = getBearerToken(request);
  const querySecret = request.nextUrl.searchParams.get('secret');
  return bearer === secret || querySecret === secret;
}

async function handleReconcile(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  const parsed = reconcileQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get('limit') || undefined,
    shop_id: request.nextUrl.searchParams.get('shop_id') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: 'Parametros invalidos.' }, { status: 400 });
  }

  try {
    const results = await reconcileMercadoPagoPaymentIntents({
      ...(typeof parsed.data.limit === 'number' ? { limit: parsed.data.limit } : {}),
      ...(parsed.data.shop_id ? { shopId: parsed.data.shop_id } : {}),
    });

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (cause) {
    return NextResponse.json(
      {
        message: cause instanceof Error ? cause.message : 'No se pudo reconciliar pagos.',
      },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  return handleReconcile(request);
}

export async function GET(request: NextRequest) {
  return handleReconcile(request);
}
