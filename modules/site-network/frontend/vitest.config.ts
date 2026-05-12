import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.tsx', 'src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/components/**',
        'src/pages/**',
        'src/hooks/**',
        'src/utils/**',
      ],
      exclude: [
        'src/**/__tests__/**',
        'src/**/index.ts',
      ],
      reporter: ['text', 'lcov'],
    },
  },
});
