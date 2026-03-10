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
      NAVAJA_TEST_MODE: process.env.NAVAJA_TEST_MODE || 'mock',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key-1234567890',
      NEXT_PUBLIC_SHOP_ID:
        process.env.NEXT_PUBLIC_SHOP_ID || '11111111-1111-1111-1111-111111111111',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3100',
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key-1234567890',
      REVIEW_LINK_SIGNING_SECRET:
        process.env.REVIEW_LINK_SIGNING_SECRET || 'test-review-signing-secret-1234567890',
      MERCADO_PAGO_ACCESS_TOKEN:
        process.env.MERCADO_PAGO_ACCESS_TOKEN || 'test-mercadopago-access-token-1234567890',
      MERCADO_PAGO_WEBHOOK_TOKEN:
        process.env.MERCADO_PAGO_WEBHOOK_TOKEN || 'test-mercadopago-webhook-token',
      MERCADO_PAGO_WEBHOOK_SECRET:
        process.env.MERCADO_PAGO_WEBHOOK_SECRET || 'test-mercadopago-webhook-secret',
      MERCADO_PAGO_APP_ID: process.env.MERCADO_PAGO_APP_ID || '123456',
      MERCADO_PAGO_CLIENT_SECRET:
        process.env.MERCADO_PAGO_CLIENT_SECRET || 'test-mercadopago-client-secret',
      MERCADO_PAGO_OAUTH_REDIRECT_URI:
        process.env.MERCADO_PAGO_OAUTH_REDIRECT_URI ||
        'http://127.0.0.1:3100/api/admin/payments/mercadopago/callback',
      MERCADO_PAGO_OAUTH_AUTH_BASE_URL:
        process.env.MERCADO_PAGO_OAUTH_AUTH_BASE_URL || 'https://auth.mercadopago.com.uy',
      SHOP_PAYMENT_ACCOUNT_CRYPTO_SECRET:
        process.env.SHOP_PAYMENT_ACCOUNT_CRYPTO_SECRET ||
        'test-shop-payment-account-crypto-secret-1234567890',
      PAYMENT_RECONCILE_CRON_SECRET:
        process.env.PAYMENT_RECONCILE_CRON_SECRET || 'test-payment-reconcile-cron-secret-1234567890',
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
