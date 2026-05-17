import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { target: 'node18' },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**', 'src/graphql/resolvers/**'],
      exclude: ['src/**/__tests__/**'],
      reporter: ['text', 'lcov'],
    },
  },
});
