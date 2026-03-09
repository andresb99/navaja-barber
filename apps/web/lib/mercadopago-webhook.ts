import crypto from 'node:crypto';
import { sanitizeText } from '@/lib/sanitize';

export interface MercadoPagoParsedSignature {
  timestamp: string;
  v1: string;
}

function timingSafeHexCompare(leftHex: string, rightHex: string) {
  if (leftHex.length !== rightHex.length) {
    return false;
  }

  const leftBuffer = Buffer.from(leftHex, 'hex');
  const rightBuffer = Buffer.from(rightHex, 'hex');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function parseMercadoPagoSignatureHeader(
  signatureHeader: string | null | undefined,
): MercadoPagoParsedSignature | null {
  const normalizedHeader = sanitizeText(signatureHeader, {
    trim: true,
    collapseWhitespace: true,
  });
  if (!normalizedHeader) {
    return null;
  }

  let timestamp: string | null = null;
  let v1: string | null = null;

  for (const chunk of normalizedHeader.split(',')) {
    const [rawKey, rawValue] = chunk.split('=');
    const key = sanitizeText(rawKey, { trim: true, lowercase: true }) || '';
    const value = sanitizeText(rawValue, { trim: true }) || '';

    if (!key || !value) {
      continue;
    }

    if (key === 'ts') {
      timestamp = value;
      continue;
    }

    if (key === 'v1') {
      v1 = value.toLowerCase();
    }
  }

  if (!timestamp || !/^\d{1,20}$/.test(timestamp)) {
    return null;
  }

  if (!v1 || !/^[a-f0-9]{64}$/.test(v1)) {
    return null;
  }

  return { timestamp, v1 };
}

export function isMercadoPagoWebhookSignatureValid(input: {
  secret: string;
  paymentId: string;
  requestIdHeader: string | null | undefined;
  signatureHeader: string | null | undefined;
}) {
  const secret = sanitizeText(input.secret, { trim: true });
  const paymentId = sanitizeText(input.paymentId, { trim: true });
  const requestId = sanitizeText(input.requestIdHeader, { trim: true }) || '';
  const parsedSignature = parseMercadoPagoSignatureHeader(input.signatureHeader);

  if (!secret || !paymentId || !parsedSignature) {
    return false;
  }

  const signatureManifest = `id:${paymentId};request-id:${requestId};ts:${parsedSignature.timestamp};`;
  const expectedHash = crypto.createHmac('sha256', secret).update(signatureManifest).digest('hex');

  return timingSafeHexCompare(parsedSignature.v1, expectedHash);
}
