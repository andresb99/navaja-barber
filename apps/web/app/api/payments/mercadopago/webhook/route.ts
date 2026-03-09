import { NextResponse, type NextRequest } from 'next/server';
import { getMercadoPagoServerEnv } from '@/lib/env.server';
import { isMercadoPagoWebhookSignatureValid } from '@/lib/mercadopago-webhook';
import { processMercadoPagoPaymentWebhook } from '@/lib/payment-intents.server';
import { readSanitizedJsonBody, sanitizeText } from '@/lib/sanitize';

function extractPaymentId(request: NextRequest, body: unknown) {
  const queryId = sanitizeText(request.nextUrl.searchParams.get('id'));
  if (queryId) {
    return queryId;
  }
  const queryDataId = sanitizeText(request.nextUrl.searchParams.get('data.id'));
  if (queryDataId) {
    return queryDataId;
  }
  const queryDataIdAlt = sanitizeText(request.nextUrl.searchParams.get('data_id'));
  if (queryDataIdAlt) {
    return queryDataIdAlt;
  }
  const queryResource = sanitizeText(request.nextUrl.searchParams.get('resource'));
  if (queryResource) {
    const resourceMatch = queryResource.match(/\/payments\/(\d+)(?:$|[/?#])/i);
    if (resourceMatch?.[1]) {
      return sanitizeText(resourceMatch[1]) || null;
    }
  }

  if (body && typeof body === 'object') {
    const asRecord = body as Record<string, unknown>;
    const rootId = asRecord.id;
    if (typeof rootId === 'string' || typeof rootId === 'number') {
      return sanitizeText(String(rootId)) || null;
    }
    const data = asRecord.data;
    if (data && typeof data === 'object' && 'id' in data) {
      const dataId = (data as { id?: string | number }).id;
      if (typeof dataId === 'string' || typeof dataId === 'number') {
        return sanitizeText(String(dataId)) || null;
      }
    }
    const resource = asRecord.resource;
    if (typeof resource === 'string') {
      const resourceMatch = resource.match(/\/payments\/(\d+)(?:$|[/?#])/i);
      if (resourceMatch?.[1]) {
        return sanitizeText(resourceMatch[1]) || null;
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const body = (await readSanitizedJsonBody(request)) || {};
  const paymentId = extractPaymentId(request, body);
  const mercadoPagoEnv = getMercadoPagoServerEnv();

  const webhookToken = sanitizeText(mercadoPagoEnv.MERCADO_PAGO_WEBHOOK_TOKEN, { trim: true }) || null;
  if (!webhookToken) {
    return new NextResponse('Webhook no configurado: falta MERCADO_PAGO_WEBHOOK_TOKEN.', {
      status: 503,
    });
  }
  const webhookSecret = sanitizeText(mercadoPagoEnv.MERCADO_PAGO_WEBHOOK_SECRET, { trim: true }) || null;
  if (!webhookSecret) {
    return new NextResponse('Webhook no configurado: falta MERCADO_PAGO_WEBHOOK_SECRET.', {
      status: 503,
    });
  }

  const providedToken = sanitizeText(request.nextUrl.searchParams.get('token')) || null;
  if (webhookToken !== providedToken) {
    return new NextResponse('Webhook token invalido.', { status: 401 });
  }

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const isWebhookSignatureValid = isMercadoPagoWebhookSignatureValid({
    secret: webhookSecret,
    paymentId,
    requestIdHeader: request.headers.get('x-request-id'),
    signatureHeader: request.headers.get('x-signature'),
  });
  if (!isWebhookSignatureValid) {
    return new NextResponse('Webhook signature invalida.', { status: 401 });
  }

  try {
    const result = await processMercadoPagoPaymentWebhook(paymentId);
    return NextResponse.json(result);
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Error procesando webhook.', {
      status: 500,
    });
  }
}

export async function GET(request: NextRequest) {
  const mercadoPagoEnv = getMercadoPagoServerEnv();
  const webhookToken = sanitizeText(mercadoPagoEnv.MERCADO_PAGO_WEBHOOK_TOKEN, { trim: true }) || null;
  if (!webhookToken) {
    return new NextResponse('Webhook no configurado: falta MERCADO_PAGO_WEBHOOK_TOKEN.', {
      status: 503,
    });
  }
  const webhookSecret = sanitizeText(mercadoPagoEnv.MERCADO_PAGO_WEBHOOK_SECRET, { trim: true }) || null;
  if (!webhookSecret) {
    return new NextResponse('Webhook no configurado: falta MERCADO_PAGO_WEBHOOK_SECRET.', {
      status: 503,
    });
  }

  const providedToken = sanitizeText(request.nextUrl.searchParams.get('token')) || null;
  if (webhookToken !== providedToken) {
    return new NextResponse('Webhook token invalido.', { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
