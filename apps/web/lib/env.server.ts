import 'server-only';
import { z } from 'zod';
import { env } from './env';

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  REVIEW_LINK_SIGNING_SECRET: z.string().min(32),
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  REVIEW_LINK_SIGNING_SECRET: process.env.REVIEW_LINK_SIGNING_SECRET,
});

if (!parsed.success) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  const invalidKeys = Object.entries(fieldErrors)
    .filter(([, messages]) => (messages?.length || 0) > 0)
    .map(([key]) => key)
    .join(', ');
  throw new Error(
    `Variables de entorno invalidas en apps/web/.env.local: ${invalidKeys}. Revisa apps/web/.env.example`,
  );
}

export const serverEnv = {
  ...env,
  ...parsed.data,
};
