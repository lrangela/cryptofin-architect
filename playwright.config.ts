import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:5173';
const RUN_CROSS_BROWSER = process.env['PW_CROSS_BROWSER'] === 'true';

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  failOnFlakyOnly: true,
  outputDir: 'e2e/results',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'e2e/playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(RUN_CROSS_BROWSER
      ? [
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
        ]
      : []),
  ],
  webServer: {
    command: 'npm run dev -- --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      DISABLE_CACHE: 'true',
      E2E_MOCK_API: 'true',
    },
  },
});
