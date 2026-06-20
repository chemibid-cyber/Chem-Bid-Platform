import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Integration tests — run against a real Postgres (TEST_DATABASE_URL) via
 * `npm run test:integration`. Kept separate from the default unit suite so
 * `npm test` stays fast and DB-free.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['src/test/integration/setup.ts'],
    // One shared test DB → don't run files concurrently.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
