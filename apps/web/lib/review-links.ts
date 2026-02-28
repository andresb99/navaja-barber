import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getReviewLinkSigningSecret } from '@/lib/env.server';

const REVIEW_TOKEN_BYTES = 32;

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function signToken(value: string) {
  return createHmac('sha256', getReviewLinkSigningSecret()).update(value).digest('base64url');
}

export interface SignedReviewToken {
  rawToken: string;
  signedToken: string;
  tokenHash: string;
}

export function createSignedReviewToken(): SignedReviewToken {
  const rawToken = randomBytes(REVIEW_TOKEN_BYTES).toString('base64url');
  const signature = signToken(rawToken);

  return {
    rawToken,
    signedToken: `${rawToken}.${signature}`,
    tokenHash: sha256(rawToken),
  };
}

export function verifySignedReviewToken(signedToken: string): string | null {
  const [rawToken, signature, ...rest] = signedToken.split('.');
  if (!rawToken || !signature || rest.length > 0) {
    return null;
  }

  const expected = signToken(rawToken);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  return rawToken;
}

export function hashOpaqueValue(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  return sha256(normalized);
}
