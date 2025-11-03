import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    include: ['**/*.integration.test.ts'],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});
