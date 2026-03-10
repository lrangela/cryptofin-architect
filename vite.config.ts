/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  const isGitHubPages = process.env.DEPLOY_TARGET === 'github-pages';
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const pagesBase = repositoryName ? `/${repositoryName}/` : '/';

  return {
    base: isGitHubPages ? pagesBase : '/',
    build: {
      target: ['es2020'],
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
      include: ['**/*.spec.ts'],
      reporters: ['default'],
    },
  };
});
