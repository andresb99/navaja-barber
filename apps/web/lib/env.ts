import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SHOP_ID: z.string().uuid(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SHOP_ID: process.env.NEXT_PUBLIC_SHOP_ID,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
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

export const env = parsed.data;

