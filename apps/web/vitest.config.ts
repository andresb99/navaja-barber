import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': rootDir,
      'server-only': resolve(rootDir, 'test/mocks/server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15000,
    setupFiles: [resolve(rootDir, 'test/setup.ts')],
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-1234567890',
      NEXT_PUBLIC_SHOP_ID: '11111111-1111-1111-1111-111111111111',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      all: true,
      include: [
        'app/book/page.tsx',
        'components/public/book-page-content.tsx',
        'app/courses/page.tsx',
        'app/jobs/page.tsx',
        'app/modelos/page.tsx',
        'app/shops/page.tsx',
        'components/public/public-section-empty-state.tsx',
        'lib/cn.ts',
        'lib/navigation.ts',
        'lib/request-origin.ts',
        'lib/shop-links.ts',
        'lib/test-runtime.ts',
        'lib/workspace-routes.ts',
      ],
      exclude: ['**/*.d.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
