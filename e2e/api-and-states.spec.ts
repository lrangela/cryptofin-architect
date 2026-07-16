import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('GET /api/v1/healthz returns ok status', async ({ request }) => {
    const response = await request.get('/api/v1/healthz');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
    expect(typeof body.uptime).toBe('number');
  });
});

test.describe('API Error Handling', () => {
  test('GET /api/v1/crypto with empty ids returns error', async ({ request }) => {
    const response = await request.get('/api/v1/crypto?ids=');
    // Should return an error response, not crash
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/v1/news with empty query returns error or empty', async ({ request }) => {
    const response = await request.get('/api/v1/news?q=');
    // Should handle empty query gracefully
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('Market Page - Loading States', () => {
  test('shows skeleton cards when coins are loading', async ({ page }) => {
    await page.goto('/market');
    // The market grid should exist with cards (either loaded or skeleton)
    const grid = page.locator('.market-grid');
    await expect(grid).toBeVisible({ timeout: 10000 });
  });

  test('shows market cards after data loads', async ({ page }) => {
    await page.goto('/market');
    // Wait for at least one market card to appear
    const cards = page.locator('.market-card');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('News Page - Search States', () => {
  test('shows empty state when no search query', async ({ page }) => {
    await page.goto('/news');
    await expect(page.getByRole('heading', { name: 'Start a search' })).toBeVisible();
  });

  test('shows loading state after typing query', async ({ page }) => {
    await page.goto('/news');
    const input = page.locator('input[type="search"]');
    await input.fill('bitcoin');
    await input.press('Enter');

    // Should show loading or results
    const loadingOrResults = page.locator('.state-card, .news-grid');
    await expect(loadingOrResults.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Navigation', () => {
  test('navigates between news and market', async ({ page }) => {
    await page.goto('/news');
    await page.locator('a', { hasText: 'Market' }).click();
    await expect(page).toHaveURL(/\/market/);

    await page.locator('a', { hasText: 'News' }).click();
    await expect(page).toHaveURL(/\/news/);
  });
});
