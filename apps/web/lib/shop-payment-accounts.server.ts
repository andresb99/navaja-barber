import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { getMercadoPagoOAuthEnv, getMercadoPagoServerEnv } from '@/lib/env.server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const OAUTH_TOKEN_ENDPOINT = 'https://api.mercadolibre.com/oauth/token';
const OAUTH_PROFILE_ENDPOINT = 'https://api.mercadopago.com/users/me';
const CONNECT_STATE_TTL_MS = 15 * 60 * 1000;

const AUTH_BASE_URL_BY_COUNTRY: Record<string, string> = {
  AR: 'https://auth.mercadopago.com.ar',
  BR: 'https://auth.mercadopago.com.br',
  CL: 'https://auth.mercadopago.cl',
  CO: 'https://auth.mercadopago.com.co',
  MX: 'https://auth.mercadopago.com.mx',
  PE: 'https://auth.mercadopago.com.pe',
  UY: 'https://auth.mercadopago.com.uy',
};

interface MercadoPagoOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  user_id?: number;
}

interface MercadoPagoUserProfileResponse {
  id: number;
  nickname?: string;
  email?: string;
}

interface ShopPaymentAccountRow {
  id: string;
  shop_id: string;
  provider: string;
  provider_user_id: number;
  provider_nickname: string | null;
  provider_email: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  access_token_expires_at: string | null;
  token_scope: string | null;
  status: string;
  is_active: boolean;
  connected_by_user_id: string | null;
  connected_at: string;
  last_checked_at: string | null;
  last_refreshed_at: string | null;
  last_error: string | null;
}

export interface ShopPaymentAccountSummary {
  id: string;
  provider: 'mercado_pago';
  providerUserId: number;
  nickname: string | null;
  email: string | null;
  status: 'connected' | 'disconnected' | 'error';
  isActive: boolean;
  connectedAt: string;
  lastCheckedAt: string | null;
  lastRefreshedAt: string | null;
  lastError: string | null;
}

export interface ShopMercadoPagoCredentials {
  paymentAccountId: string;
  shopId: string;
  providerUserId: number;
  providerNickname: string | null;
  providerEmail: string | null;
  accessToken: string;
}

interface ConnectStatePayload {
  shopId: string;
  shopSlug: string;
  actorUserId: string;
  issuedAt: number;
}

function getPurposeKey(purpose: string) {
  const secret = getMercadoPagoOAuthEnv().SHOP_PAYMENT_ACCOUNT_CRYPTO_SECRET;
  return createHash('sha256').update(`${purpose}:${secret}`).digest();
}

function encryptSecret(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getPurposeKey('shop-payment-account-encryption'), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptSecret(cipherText: string) {
  const [ivPart, tagPart, encryptedPart] = String(cipherText || '').split('.');
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Credencial cifrada invalida.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getPurposeKey('shop-payment-account-encryption'),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function signState(payload: string) {
  return createHmac('sha256', getPurposeKey('shop-payment-account-state')).update(payload).digest('base64url');
}

export function createMercadoPagoConnectState(input: {
  shopId: string;
  shopSlug: string;
  actorUserId: string;
}) {
  const payload: ConnectStatePayload = {
    shopId: input.shopId,
    shopSlug: input.shopSlug,
    actorUserId: input.actorUserId,
    issuedAt: Date.now(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signState(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyMercadoPagoConnectState(state: string): ConnectStatePayload {
  const [encodedPayload, signature] = String(state || '').split('.');
  if (!encodedPayload || !signature) {
    throw new Error('Estado de conexion invalido.');
  }

  const expectedSignature = signState(encodedPayload);
  if (
    Buffer.byteLength(expectedSignature) !== Buffer.byteLength(signature) ||
    !timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
  ) {
    throw new Error('No se pudo verificar la solicitud de conexion.');
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as ConnectStatePayload;
  if (!payload.shopId || !payload.shopSlug || !payload.actorUserId || !payload.issuedAt) {
    throw new Error('Estado de conexion incompleto.');
  }

  if (Date.now() - payload.issuedAt > CONNECT_STATE_TTL_MS) {
    throw new Error('La solicitud para conectar Mercado Pago expiro. Intenta nuevamente.');
  }

  return payload;
}

function resolveAuthorizationBaseUrl(countryCode?: string | null) {
  const env = getMercadoPagoOAuthEnv();
  if (env.MERCADO_PAGO_OAUTH_AUTH_BASE_URL) {
    return env.MERCADO_PAGO_OAUTH_AUTH_BASE_URL.replace('auth.mercadolibre.', 'auth.mercadopago.').replace(
      'auth.mercadolivre.',
      'auth.mercadopago.',
    );
  }

  const normalizedCountryCode = String(countryCode || '').trim().toUpperCase();
  return AUTH_BASE_URL_BY_COUNTRY[normalizedCountryCode] || AUTH_BASE_URL_BY_COUNTRY.UY;
}

export function buildMercadoPagoOAuthAuthorizationUrl(input: {
  state: string;
  countryCode?: string | null;
}) {
  const env = getMercadoPagoOAuthEnv();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.MERCADO_PAGO_APP_ID,
    redirect_uri: env.MERCADO_PAGO_OAUTH_REDIRECT_URI,
    platform_id: 'mp',
    state: input.state,
  });

  return `${resolveAuthorizationBaseUrl(input.countryCode)}/authorization?${params.toString()}`;
}

async function exchangeMercadoPagoOAuthCode(code: string) {
  const env = getMercadoPagoOAuthEnv();
  const response = await fetch(OAUTH_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.MERCADO_PAGO_APP_ID,
      client_secret: env.MERCADO_PAGO_CLIENT_SECRET,
      code,
      redirect_uri: env.MERCADO_PAGO_OAUTH_REDIRECT_URI,
    }),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | (MercadoPagoOAuthTokenResponse & { message?: string; error?: string; cause?: unknown })
    | null;

  if (!response.ok || !payload?.access_token || !payload.refresh_token) {
    throw new Error(payload?.message || payload?.error || 'No se pudo conectar la cuenta de Mercado Pago.');
  }

  return payload;
}

async function refreshMercadoPagoOAuthToken(refreshToken: string) {
  const env = getMercadoPagoOAuthEnv();
  const response = await fetch(OAUTH_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: env.MERCADO_PAGO_APP_ID,
      client_secret: env.MERCADO_PAGO_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | (MercadoPagoOAuthTokenResponse & { message?: string; error?: string })
    | null;

  if (!response.ok || !payload?.access_token || !payload.refresh_token) {
    throw new Error(payload?.message || payload?.error || 'No se pudo renovar la conexion de Mercado Pago.');
  }

  return payload;
}

async function getMercadoPagoUserProfile(accessToken: string) {
  const response = await fetch(OAUTH_PROFILE_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | (MercadoPagoUserProfileResponse & { message?: string; error?: string })
    | null;

  if (!response.ok || !payload?.id) {
    throw new Error(payload?.message || payload?.error || 'No se pudo validar la cuenta de Mercado Pago.');
  }

  return payload;
}

function resolveExpiryDate(expiresInSeconds: number | null | undefined) {
  const seconds = Number(expiresInSeconds || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const next = new Date();
  next.setSeconds(next.getSeconds() + seconds);
  return next.toISOString();
}

function toSummary(row: ShopPaymentAccountRow): ShopPaymentAccountSummary {
  return {
    id: row.id,
    provider: 'mercado_pago',
    providerUserId: row.provider_user_id,
    nickname: row.provider_nickname,
    email: row.provider_email,
    status: row.status as ShopPaymentAccountSummary['status'],
    isActive: row.is_active,
    connectedAt: row.connected_at,
    lastCheckedAt: row.last_checked_at,
    lastRefreshedAt: row.last_refreshed_at,
    lastError: row.last_error,
  };
}

export async function getShopMercadoPagoAccountSummary(shopId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('shop_payment_accounts')
    .select(
      'id, shop_id, provider, provider_user_id, provider_nickname, provider_email, access_token_encrypted, refresh_token_encrypted, access_token_expires_at, token_scope, status, is_active, connected_by_user_id, connected_at, last_checked_at, last_refreshed_at, last_error',
    )
    .eq('shop_id', shopId)
    .eq('provider', 'mercado_pago')
    .eq('is_active', true)
    .order('connected_at', { ascending: false })
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'No se pudo consultar la conexion de Mercado Pago.');
  }

  return data ? toSummary(data as ShopPaymentAccountRow) : null;
}

async function persistShopMercadoPagoConnection(input: {
  shopId: string;
  actorUserId: string;
  tokenResponse: MercadoPagoOAuthTokenResponse;
  profile: MercadoPagoUserProfileResponse;
}) {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const accountPayload = {
    provider: 'mercado_pago',
    provider_user_id: input.profile.id,
    provider_nickname: input.profile.nickname || null,
    provider_email: input.profile.email || null,
    access_token_encrypted: encryptSecret(input.tokenResponse.access_token),
    refresh_token_encrypted: encryptSecret(input.tokenResponse.refresh_token),
    access_token_expires_at: resolveExpiryDate(input.tokenResponse.expires_in),
    token_scope: input.tokenResponse.scope || null,
    status: 'connected',
    is_active: true,
    connected_by_user_id: input.actorUserId,
    connected_at: now,
    last_checked_at: now,
    last_refreshed_at: now,
    last_error: null,
  };

  const { data: existing } = await admin
    .from('shop_payment_accounts')
    .select('id, provider_user_id')
    .eq('shop_id', input.shopId)
    .eq('provider', 'mercado_pago')
    .eq('provider_user_id', input.profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin
    .from('shop_payment_accounts')
    .update({
      is_active: false,
      status: 'disconnected',
      last_error: null,
    })
    .eq('shop_id', input.shopId)
    .eq('provider', 'mercado_pago')
    .eq('is_active', true);

  if (existing?.id) {
    const { error: updateError } = await admin
      .from('shop_payment_accounts')
      .update(accountPayload)
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(updateError.message || 'No se pudo guardar la conexion de Mercado Pago.');
    }

    const { data: row } = await admin
      .from('shop_payment_accounts')
      .select(
        'id, shop_id, provider, provider_user_id, provider_nickname, provider_email, access_token_encrypted, refresh_token_encrypted, access_token_expires_at, token_scope, status, is_active, connected_by_user_id, connected_at, last_checked_at, last_refreshed_at, last_error',
      )
      .eq('id', existing.id)
      .maybeSingle();

    return row ? toSummary(row as ShopPaymentAccountRow) : null;
  }

  const { data: inserted, error: insertError } = await admin
    .from('shop_payment_accounts')
    .insert({
      id: randomUUID(),
      shop_id: input.shopId,
      ...accountPayload,
    })
    .select(
      'id, shop_id, provider, provider_user_id, provider_nickname, provider_email, access_token_encrypted, refresh_token_encrypted, access_token_expires_at, token_scope, status, is_active, connected_by_user_id, connected_at, last_checked_at, last_refreshed_at, last_error',
    )
    .maybeSingle();

  if (insertError) {
    throw new Error(insertError.message || 'No se pudo registrar la cuenta de Mercado Pago.');
  }

  return inserted ? toSummary(inserted as ShopPaymentAccountRow) : null;
}

export async function connectShopMercadoPagoAccount(input: {
  shopId: string;
  actorUserId: string;
  code: string;
}) {
  const tokenResponse = await exchangeMercadoPagoOAuthCode(input.code);
  const profile = await getMercadoPagoUserProfile(tokenResponse.access_token);

  return persistShopMercadoPagoConnection({
    shopId: input.shopId,
    actorUserId: input.actorUserId,
    tokenResponse,
    profile,
  });
}

export async function disconnectShopMercadoPagoAccount(shopId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('shop_payment_accounts')
    .update({
      is_active: false,
      status: 'disconnected',
      last_error: null,
    })
    .eq('shop_id', shopId)
    .eq('provider', 'mercado_pago')
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message || 'No se pudo desconectar Mercado Pago.');
  }
}

async function refreshStoredShopPaymentAccount(row: ShopPaymentAccountRow) {
  const admin = createSupabaseAdminClient();
  const refreshToken = decryptSecret(row.refresh_token_encrypted);
  const tokenResponse = await refreshMercadoPagoOAuthToken(refreshToken);
  const refreshedAt = new Date().toISOString();
  const nextValues = {
    access_token_encrypted: encryptSecret(tokenResponse.access_token),
    refresh_token_encrypted: encryptSecret(tokenResponse.refresh_token),
    access_token_expires_at: resolveExpiryDate(tokenResponse.expires_in),
    token_scope: tokenResponse.scope || row.token_scope || null,
    status: 'connected',
    last_refreshed_at: refreshedAt,
    last_checked_at: refreshedAt,
    last_error: null,
  };

  const { error } = await admin
    .from('shop_payment_accounts')
    .update(nextValues)
    .eq('id', row.id);

  if (error) {
    throw new Error(error.message || 'No se pudo refrescar la cuenta de Mercado Pago.');
  }

  return {
    ...row,
    ...nextValues,
  } satisfies ShopPaymentAccountRow;
}

function isTokenExpired(expiryIso: string | null | undefined) {
  const expiryTime = new Date(String(expiryIso || '')).getTime();
  if (!Number.isFinite(expiryTime)) {
    return false;
  }

  return expiryTime <= Date.now() + 60_000;
}

export async function getShopMercadoPagoCredentials(input: {
  shopId?: string | null;
  paymentAccountId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from('shop_payment_accounts')
    .select(
      'id, shop_id, provider, provider_user_id, provider_nickname, provider_email, access_token_encrypted, refresh_token_encrypted, access_token_expires_at, token_scope, status, is_active, connected_by_user_id, connected_at, last_checked_at, last_refreshed_at, last_error',
    )
    .eq('provider', 'mercado_pago');

  const paymentAccountId = String(input.paymentAccountId || '').trim();
  if (paymentAccountId) {
    query = query.eq('id', paymentAccountId);
  } else {
    const shopId = String(input.shopId || '').trim();
    if (!shopId) {
      throw new Error('Shop id requerido para resolver la cuenta de Mercado Pago.');
    }
    query = query.eq('shop_id', shopId).eq('is_active', true);
  }

  const { data, error } = await query.order('connected_at', { ascending: false }).maybeSingle();

  if (error) {
    throw new Error(error.message || 'No se pudo consultar la cuenta de Mercado Pago.');
  }

  if (!data) {
    return null;
  }

  let row = data as ShopPaymentAccountRow;
  try {
    if (isTokenExpired(row.access_token_expires_at)) {
      row = await refreshStoredShopPaymentAccount(row);
    } else {
      await admin
        .from('shop_payment_accounts')
        .update({ last_checked_at: new Date().toISOString(), last_error: null, status: 'connected' })
        .eq('id', row.id);
    }

    return {
      paymentAccountId: row.id,
      shopId: row.shop_id,
      providerUserId: row.provider_user_id,
      providerNickname: row.provider_nickname,
      providerEmail: row.provider_email,
      accessToken: decryptSecret(row.access_token_encrypted),
    } satisfies ShopMercadoPagoCredentials;
  } catch (error) {
    await admin
      .from('shop_payment_accounts')
      .update({
        status: 'error',
        last_error: error instanceof Error ? error.message : 'No se pudo usar la conexion de Mercado Pago.',
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    throw error;
  }
}

export function getPlatformMercadoPagoCredentials() {
  const env = getMercadoPagoServerEnv();
  return {
    accessToken: env.MERCADO_PAGO_ACCESS_TOKEN,
  };
}
