import { z } from 'zod';

const urlSchema = z.string().url();
const anonKeySchema = z.string().min(20);
const shopIdSchema = z.string().uuid();

const fallbackEnv = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://invalid.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'invalid_anon_key_for_local_dev_only_0000000000',
  EXPO_PUBLIC_SHOP_ID: '00000000-0000-0000-0000-000000000000',
} as const;

function normalizeEnvValue(value: string | undefined) {
  if (value == null) {
    return undefined;
  }

  return value.trim().replace(/^['"]|['"]$/g, '');
}

const rawEnv = {
  EXPO_PUBLIC_SUPABASE_URL: normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  EXPO_PUBLIC_SHOP_ID: normalizeEnvValue(process.env.EXPO_PUBLIC_SHOP_ID),
};

const urlResult = urlSchema.safeParse(rawEnv.EXPO_PUBLIC_SUPABASE_URL);
const anonKeyResult = anonKeySchema.safeParse(rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const shopIdResult = shopIdSchema.safeParse(rawEnv.EXPO_PUBLIC_SHOP_ID);

const invalidKeys: string[] = [];
if (!urlResult.success) {
  invalidKeys.push('EXPO_PUBLIC_SUPABASE_URL');
}
if (!anonKeyResult.success) {
  invalidKeys.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
}
if (!shopIdResult.success) {
  invalidKeys.push('EXPO_PUBLIC_SHOP_ID');
}

export const env = {
  EXPO_PUBLIC_SUPABASE_URL: urlResult.success
    ? urlResult.data
    : fallbackEnv.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: anonKeyResult.success
    ? anonKeyResult.data
    : fallbackEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SHOP_ID: shopIdResult.success
    ? shopIdResult.data
    : fallbackEnv.EXPO_PUBLIC_SHOP_ID,
};

export const envValidation = {
  isValid: invalidKeys.length === 0,
  invalidKeys,
  message:
    invalidKeys.length === 0
      ? null
      : `Variables de entorno invalidas en apps/mobile/.env: ${invalidKeys.join(
          ', ',
        )}. Revisa apps/mobile/.env.example`,
};

