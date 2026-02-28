import 'server-only';
import { z } from 'zod';
import { env } from './env';

const supabaseServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

const reviewServerEnvSchema = z.object({
  REVIEW_LINK_SIGNING_SECRET: z.string().min(32),
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
