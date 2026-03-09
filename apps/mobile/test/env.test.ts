import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function loadEnvModule(overrides: Record<string, string | undefined> = {}) {
  const nextEnv: NodeJS.ProcessEnv = {
    ...ORIGINAL_ENV,
    EXPO_PUBLIC_SUPABASE_URL: 'https://unit-test.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon_key_for_unit_tests_1234567890',
    EXPO_PUBLIC_SHOP_ID: '11111111-1111-1111-1111-111111111111',
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete nextEnv[key];
      continue;
    }

    nextEnv[key] = value;
  }

  process.env = nextEnv;
  vi.resetModules();

  return import('../lib/env');
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('mobile env', () => {
  it('normalizes API base URL and strips trailing slash', async () => {
    const { env, envValidation } = await loadEnvModule({
      EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com/',
    });

    expect(env.EXPO_PUBLIC_API_BASE_URL).toBe('https://api.example.com');
    expect(envValidation.isValid).toBe(true);
  });

  it('falls back to zero shop id when EXPO_PUBLIC_SHOP_ID is invalid', async () => {
    const { env, envValidation } = await loadEnvModule({
      EXPO_PUBLIC_SHOP_ID: 'not-a-uuid',
    });

    expect(env.EXPO_PUBLIC_SHOP_ID).toBe('00000000-0000-0000-0000-000000000000');
    expect(envValidation.invalidKeys).toContain('EXPO_PUBLIC_SHOP_ID');
    expect(envValidation.isValid).toBe(false);
  });
});
