import 'server-only';

import { getMercadoPagoServerEnv } from '@/lib/env.server';

interface MercadoPagoPreferenceItemInput {
  id: string;
  title: string;
  description?: string;
  amountCents: number;
  quantity?: number;
}

interface CreateMercadoPagoPreferenceInput {
  item: MercadoPagoPreferenceItemInput;
  payerEmail?: string | null;
  externalReference: string;
  successUrl: string;
  pendingUrl: string;
  failureUrl: string;
  notificationUrl: string;
  metadata?: Record<string, unknown>;
}

interface MercadoPagoPreferenceResponse {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
}

interface MercadoPagoPaymentResponse {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  metadata?: Record<string, unknown>;
  transaction_amount?: number;
  currency_id?: string;
  payer?: {
    email?: string;
  };
}

function getApiBaseUrl() {
  const env = getMercadoPagoServerEnv();
  return env.MERCADO_PAGO_API_BASE_URL || 'https://api.mercadopago.com';
}

function getAccessToken() {
  const env = getMercadoPagoServerEnv();
  return env.MERCADO_PAGO_ACCESS_TOKEN;
}

function isTestAccessToken(value: string | null | undefined) {
  return String(value || '').trim().toUpperCase().startsWith('TEST-');
}

async function mercadoPagoRequest<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | (TResponse & { message?: string; cause?: unknown })
    | null;

  if (!response.ok || !payload) {
    const reason =
      (payload && typeof payload.message === 'string' && payload.message) ||
      `Mercado Pago request failed (${response.status})`;
    throw new Error(reason);
  }

  return payload as TResponse;
}

export async function createMercadoPagoCheckoutPreference(
  input: CreateMercadoPagoPreferenceInput,
) {
  const quantity = input.item.quantity || 1;
  const unitPrice = Number((input.item.amountCents / 100).toFixed(2));
  const accessToken = getAccessToken();
  const isTestMode = isTestAccessToken(accessToken);

  const payload = await mercadoPagoRequest<MercadoPagoPreferenceResponse>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      external_reference: input.externalReference,
      metadata: input.metadata || {},
      notification_url: input.notificationUrl,
      back_urls: {
        success: input.successUrl,
        pending: input.pendingUrl,
        failure: input.failureUrl,
      },
      auto_return: 'approved',
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      items: [
        {
          id: input.item.id,
          title: input.item.title,
          description: input.item.description || input.item.title,
          quantity,
          currency_id: 'UYU',
          unit_price: unitPrice,
        },
      ],
    }),
  });

  const checkoutUrl = isTestMode
    ? payload.sandbox_init_point || payload.init_point || null
    : payload.init_point || payload.sandbox_init_point || null;
  if (!checkoutUrl) {
    throw new Error('Mercado Pago no devolvio una URL de checkout.');
  }

  return {
    preferenceId: payload.id,
    checkoutUrl,
  };
}

export async function getMercadoPagoPayment(paymentId: string) {
  const normalizedPaymentId = String(paymentId || '').trim();
  if (!normalizedPaymentId) {
    throw new Error('Payment id invalido para consultar Mercado Pago.');
  }

  return mercadoPagoRequest<MercadoPagoPaymentResponse>(`/v1/payments/${normalizedPaymentId}`);
}
