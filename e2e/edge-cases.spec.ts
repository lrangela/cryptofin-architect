import { test, expect } from '@playwright/test';

test.describe('Edge Cases - API sin resultados', () => {
  test('debe manejar gracefully cuando la API devuelve 0 resultados', async ({ page }) => {
    await page.route('**/api/v1/news**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/news');
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('no-results-test');
    
    // Verificar mensaje de "Sin resultados" que está en el template de news.ts
    await expect(page.getByText(/sin resultados/i)).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Edge Cases - Errores de red', () => {
  test('debe manejar timeout de API', async ({ page }) => {
    await page.route('**/api/v1/news**', async (route) => {
      await route.abort('timedout');
    });
    
    await page.goto('/news');
    await page.locator('input[type="search"]').fill('timeout-test');
    
    // Buscamos la clase .state-error definida en el CSS
    await expect(page.locator('.state-error')).toBeVisible({ timeout: 15000 });
  });

  test('debe manejar error 500 de la API', async ({ page }) => {
    await page.route('**/api/v1/crypto**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ errorCode: 'SERVER_ERROR', message: 'Fallo' }),
      });
    });
    
    await page.goto('/market');
    await expect(page.locator('.state-error')).toBeVisible({ timeout: 15000 });
  });
});
