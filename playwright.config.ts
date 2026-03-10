import { defineConfig, devices } from '@playwright/test';

/**
 * Lee variables de entorno para configuración dinámica
 */
const BASE_URL = process.env['BASE_URL'] || 'http://localhost:5173';

/**
 * Ver https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Tiempo máximo para cada test */
  timeout: 30 * 1000,
  /* Tiempo máximo para esperar por una acción */
  expect: {
    timeout: 5000,
  },
  /* Fallar en el primer test fallido */
  failOnFlakyOnly: true,
  /* Carpeta para resultados */
  outputDir: 'e2e/results',
  /* Ejecutar tests en paralelo */
  fullyParallel: true,
  /* Prevenir tests huérfanos */
  forbidOnly: !!process.env['CI'],
  /* Reintentos en CI */
  retries: process.env['CI'] ? 2 : 0,
  /* Workers: auto en CI, 1 en local */
  workers: process.env['CI'] ? 1 : undefined,
  /* Reportero */
  reporter: [
    ['html', { outputFolder: 'e2e/playwright-report' }],
    ['list'],
  ],
  /* Configuración compartida */
  use: {
    /* URL base para todas las pruebas */
    baseURL: BASE_URL,
    /* Capturar screenshot solo en fallo */
    screenshot: 'only-on-failure',
    /* Capturar video en fallo */
    video: 'retain-on-failure',
    /* Trace: capturar en retry o on-first-retry */
    trace: 'retain-on-failure',
    /* Actionability checks */
    actionTimeout: 10000,
  },
  /* Configuración de navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* Tests móviles - deshabilitados en CI para ahorrar tiempo */
    ...(process.env['CI']
      ? []
      : [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
          {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
          },
          {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
          },
        ]),
  ],
  /* Servidor de desarrollo para tests */
  webServer: {
    command: 'npm run dev -- --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
    /* Variables de entorno para el servidor */
    env: {
      DISABLE_CACHE: 'true',
    },
  },
});
