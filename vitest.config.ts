import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Carga .env para desarrollo local
// En CI/CD, las variables se inyectan via GitHub Secrets
dotenv.config({ path: '.env' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/server/**/*.spec.ts',
    ],
    reporters: ['default'],
    clearMocks: true,
    restoreMocks: true,
  },
});
