import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      // Every jsdom worker boots a full React app. Keep parallelism modest so
      // lazy-route tests do not miss Testing Library's async timeout under load.
      maxWorkers: 4,
    },
  }),
);
