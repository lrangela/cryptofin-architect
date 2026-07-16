/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  const isGitHubPages = process.env.DEPLOY_TARGET === 'github-pages';
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const pagesBase = repositoryName ? `/${repositoryName}/` : '/';
  const isTest = !!process.env['VITEST'];

  return {
    base: isGitHubPages ? pagesBase : '/',
    build: {
      target: ['es2020'],
    },
    server: {
      port: Number(process.env.PORT) || 5173,
      watch: {
        ignored: ['**/e2e/results/**', '**/e2e/playwright-report/**'],
      },
    },
    resolve: {
      mainFields: ['module'],
    },
    plugins: [
      analog(),
      tailwindcss(),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/test-setup.ts'],
      include: ['src/app/**/*.spec.ts'],
      reporters: ['default'],
    },
  };
});
