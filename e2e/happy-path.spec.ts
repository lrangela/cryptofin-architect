import { test, expect } from '@playwright/test';

test.describe('Happy Path - News', () => {
  test('debe cargar News y mostrar elementos basicos', async ({ page }) => {
    await page.goto('/news', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'News', level: 1 })).toBeVisible();
    await expect(page.locator('input[type="search"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'News' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Market' })).toBeVisible();
  });
});

test.describe('Happy Path - Market', () => {
  test('debe cargar Market y mostrar elementos basicos', async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Market', level: 1 })).toBeVisible();
    await expect(page.locator('input[placeholder*="bitcoin" i]')).toBeVisible();
    await expect(page.locator('.market-card').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'News' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Market' })).toBeVisible();
  });
});
