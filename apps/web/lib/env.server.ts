import 'server-only';
import { z } from 'zod';
import { env } from './env';

const supabaseServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

const reviewServerEnvSchema = z.object({
  REVIEW_LINK_SIGNING_SECRET: z.string().min(32),
});

const mercadoPagoServerEnvSchema = z.object({
  MERCADO_PAGO_ACCESS_TOKEN: z.string().min(20),
  MERCADO_PAGO_WEBHOOK_TOKEN: z.string().min(16).optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(16).optional(),
  MERCADO_PAGO_API_BASE_URL: z.string().url().optional(),
});

const paymentOpsEnvSchema = z.object({
  PAYMENT_RECONCILE_CRON_SECRET: z.string().min(20),
});

function getInvalidKeys(error: z.ZodError) {
  return Object.entries(error.flatten().fieldErrors)
    .filter(([, messages]) => (messages?.length || 0) > 0)
    .map(([key]) => key)
    .join(', ');
}

function throwInvalidEnv(error: z.ZodError) {
  const invalidKeys = getInvalidKeys(error);
  throw new Error(
    `Variables de entorno invalidas en apps/web/.env.local: ${invalidKeys}. Revisa apps/web/.env.example`,
  );
}

function parseServerSection<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  values: Record<string, string | undefined>,
): z.infer<TSchema> {
  const parsed = schema.safeParse(values);

  if (!parsed.success) {
    throwInvalidEnv(parsed.error);
  }

  return parsed.data;
}

const supabaseServerEnv = parseServerSection(supabaseServerEnvSchema, {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export const serverEnv = {
  ...env,
  ...supabaseServerEnv,
};

export function getReviewLinkSigningSecret() {
  const reviewServerEnv = parseServerSection(reviewServerEnvSchema, {
    REVIEW_LINK_SIGNING_SECRET: process.env.REVIEW_LINK_SIGNING_SECRET,
  });
  return reviewServerEnv.REVIEW_LINK_SIGNING_SECRET;
}

export function getMercadoPagoServerEnv() {
  return parseServerSection(mercadoPagoServerEnvSchema, {
    MERCADO_PAGO_ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    MERCADO_PAGO_WEBHOOK_TOKEN: process.env.MERCADO_PAGO_WEBHOOK_TOKEN,
    MERCADO_PAGO_WEBHOOK_SECRET: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    MERCADO_PAGO_API_BASE_URL: process.env.MERCADO_PAGO_API_BASE_URL,
  });
}

export function getPaymentOpsEnv() {
  return parseServerSection(paymentOpsEnvSchema, {
    PAYMENT_RECONCILE_CRON_SECRET: process.env.PAYMENT_RECONCILE_CRON_SECRET,
  });
}
