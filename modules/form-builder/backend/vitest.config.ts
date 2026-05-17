import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    target: 'node18',
  },
  resolve: {
    alias: {
      graphql: path.resolve(__dirname, 'node_modules/graphql/index.js'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**', 'src/repositories/**', 'src/graphql/resolvers/**', 'src/federation/**'],
      exclude: ['src/**/__tests__/**', 'src/**/index.ts'],
      reporter: ['text', 'lcov'],
    },
  },
});
