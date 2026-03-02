import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const rootDir = dirname(fileURLToPath(import.meta.url));
const inheritedEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm run e2e:serve',
    cwd: rootDir,
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    env: {
      ...inheritedEnv,
      NAVAJA_TEST_MODE: 'mock',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key-1234567890',
      NEXT_PUBLIC_SHOP_ID:
        process.env.NEXT_PUBLIC_SHOP_ID || '11111111-1111-1111-1111-111111111111',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3100',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
