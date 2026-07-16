import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Carga .env para desarrollo local
dotenv.config({ path: '.env' });

export default defineConfig({
  test: {
    globals: true,
    reporters: ['default'],
    clearMocks: true,
    restoreMocks: true,
    projects: [
      {
        test: {
          name: 'client',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['src/test-setup.ts'],
          include: ['src/app/**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'server',
          globals: true,
          environment: 'node',
          include: ['src/server/**/*.spec.ts'],
        },
      },
    ],
  },
});
