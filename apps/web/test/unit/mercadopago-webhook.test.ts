import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  isMercadoPagoWebhookSignatureValid,
  parseMercadoPagoSignatureHeader,
} from '@/lib/mercadopago-webhook';

describe('parseMercadoPagoSignatureHeader', () => {
  it('parses valid signature tokens', () => {
    const parsed = parseMercadoPagoSignatureHeader(
      'ts=1716763200,v1=9f51504d7f9bf548f3635f022f5f013f05f43880f654704ecce7fa3f93c93abc',
    );
    expect(parsed).toEqual({
      timestamp: '1716763200',
      v1: '9f51504d7f9bf548f3635f022f5f013f05f43880f654704ecce7fa3f93c93abc',
    });
  });

  it('returns null on invalid signatures', () => {
    expect(parseMercadoPagoSignatureHeader('ts=foo,v1=123')).toBeNull();
    expect(parseMercadoPagoSignatureHeader('')).toBeNull();
    expect(parseMercadoPagoSignatureHeader(null)).toBeNull();
  });
});

describe('isMercadoPagoWebhookSignatureValid', () => {
  it('accepts a signature generated with the same secret and request data', () => {
    const secret = 'supersecret1234567890';
    const paymentId = '99887766';
    const requestId = 'req-123';
    const timestamp = '1716763200';
    const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
    const signature = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    expect(
      isMercadoPagoWebhookSignatureValid({
        secret,
        paymentId,
        requestIdHeader: requestId,
        signatureHeader: `ts=${timestamp},v1=${signature}`,
      }),
    ).toBe(true);
  });

  it('rejects mismatched signature or request data', () => {
    const secret = 'supersecret1234567890';
    const paymentId = '99887766';
    const requestId = 'req-123';
    const timestamp = '1716763200';
    const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
    const signature = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    expect(
      isMercadoPagoWebhookSignatureValid({
        secret,
        paymentId,
        requestIdHeader: 'another-request',
        signatureHeader: `ts=${timestamp},v1=${signature}`,
      }),
    ).toBe(false);

    expect(
      isMercadoPagoWebhookSignatureValid({
        secret,
        paymentId,
        requestIdHeader: requestId,
        signatureHeader: `ts=${timestamp},v1=${signature.slice(0, 63)}x`,
      }),
    ).toBe(false);
  });
});
