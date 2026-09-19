import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 20_000,
    // Request logy Fastify (info) by zaplavili výstup testov; chyby (warn+) ostávajú viditeľné.
    env: { LOG_LEVEL: 'warn' },
  },
});
