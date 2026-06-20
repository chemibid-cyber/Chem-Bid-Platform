import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Integration tests need a real Postgres — they run via test:integration only.
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/db/**', 'src/lib/**/*.test.ts'],
      // Ratchet floor — locks the current measured coverage so CI fails on a
      // regression. Raise these as P1 (integration) + P2 (E2E) tests land;
      // target ≥35% lines per CLAUDE.md once server actions are covered.
      thresholds: {
        lines: 22,
        statements: 22,
        functions: 55,
        branches: 78,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
