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

export interface MercadoPagoPaymentResponse {
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

interface MercadoPagoPaymentSearchResponse {
  results?: MercadoPagoPaymentResponse[];
}

interface MercadoPagoRefundResponse {
  id: number | string;
  payment_id?: number | string;
  amount?: number;
  status?: string;
}

export interface MercadoPagoApiCredentials {
  accessToken: string;
  apiBaseUrl?: string;
}

function getDefaultCredentials(): MercadoPagoApiCredentials {
  const env = getMercadoPagoServerEnv();
  return {
    accessToken: env.MERCADO_PAGO_ACCESS_TOKEN,
    ...(env.MERCADO_PAGO_API_BASE_URL ? { apiBaseUrl: env.MERCADO_PAGO_API_BASE_URL } : {}),
  };
}

function getApiBaseUrl(credentials?: MercadoPagoApiCredentials | null) {
  return credentials?.apiBaseUrl || getDefaultCredentials().apiBaseUrl || 'https://api.mercadopago.com';
}

function getAccessToken(credentials?: MercadoPagoApiCredentials | null) {
  return credentials?.accessToken || getDefaultCredentials().accessToken;
}

export function isMercadoPagoTestMode(value: string | null | undefined) {
  return String(value || '').trim().toUpperCase().startsWith('TEST-');
}

export async function mercadoPagoRequest<TResponse>(
  path: string,
  init?: RequestInit,
  credentials?: MercadoPagoApiCredentials | null,
): Promise<TResponse> {
  const response = await fetch(`${getApiBaseUrl(credentials)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getAccessToken(credentials)}`,
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
  credentials?: MercadoPagoApiCredentials | null,
) {
  const quantity = input.item.quantity || 1;
  const unitPrice = Number((input.item.amountCents / 100).toFixed(2));

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
  }, credentials);

  const checkoutUrl = payload.init_point || payload.sandbox_init_point || null;
  if (!checkoutUrl) {
    throw new Error('Mercado Pago no devolvio una URL de checkout.');
  }

  return {
    preferenceId: payload.id,
    checkoutUrl,
  };
}

export async function getMercadoPagoPayment(
  paymentId: string,
  credentials?: MercadoPagoApiCredentials | null,
) {
  const normalizedPaymentId = String(paymentId || '').trim();
  if (!normalizedPaymentId) {
    throw new Error('Payment id invalido para consultar Mercado Pago.');
  }

  return mercadoPagoRequest<MercadoPagoPaymentResponse>(`/v1/payments/${normalizedPaymentId}`, undefined, credentials);
}

export async function searchLatestMercadoPagoPaymentByExternalReference(
  externalReference: string,
  credentials?: MercadoPagoApiCredentials | null,
) {
  const normalizedExternalReference = String(externalReference || '').trim();
  if (!normalizedExternalReference) {
    throw new Error('External reference invalida para buscar pagos en Mercado Pago.');
  }

  const params = new URLSearchParams({
    external_reference: normalizedExternalReference,
    sort: 'date_created',
    criteria: 'desc',
    limit: '1',
  });
  const payload = await mercadoPagoRequest<MercadoPagoPaymentSearchResponse>(
    `/v1/payments/search?${params.toString()}`,
    undefined,
    credentials,
  );

  return payload.results?.[0] || null;
}

export async function createMercadoPagoRefund(
  paymentId: string,
  credentials?: MercadoPagoApiCredentials | null,
) {
  const normalizedPaymentId = String(paymentId || '').trim();
  if (!normalizedPaymentId) {
    throw new Error('Payment id invalido para crear reembolso en Mercado Pago.');
  }

  const payload = await mercadoPagoRequest<MercadoPagoRefundResponse>(
    `/v1/payments/${normalizedPaymentId}/refunds`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    credentials,
  );

  return {
    refundId: String(payload.id),
    paymentId: String(payload.payment_id || normalizedPaymentId),
    amount: typeof payload.amount === 'number' ? payload.amount : null,
    status: String(payload.status || '').trim() || null,
  };
}
