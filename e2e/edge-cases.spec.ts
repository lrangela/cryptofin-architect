import { test, expect } from '@playwright/test';

test.describe('Edge Cases - API sin resultados', () => {
  test('debe manejar gracefully cuando la API devuelve 0 resultados', async ({ page }) => {
    // Mocking API con resultados vacíos
    await page.route('**/api/v1/news**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/news');
    // Escribir algo para disparar la búsqueda
    await page.locator('input[type="search"]').fill('test-query');
    await page.waitForTimeout(2000);
    
    // Verificar que se muestra el mensaje de "Sin resultados" que está en tu código
    await expect(page.getByText(/sin resultados|no se encontraron/i)).toBeVisible();
  });
});

test.describe('Edge Cases - Errores de red', () => {
  test('debe manejar timeout de API', async ({ page }) => {
    // Forzamos un error de timeout abortando la ruta
    await page.route('**/api/v1/news**', async (route) => {
      await route.abort('timedout');
    });
    
    await page.goto('/news');
    await page.locator('input[type="search"]').fill('timeout-test');
    
    // Tu código usa .state-error para errores
    const errorCard = page.locator('.state-error');
    await expect(errorCard).toBeVisible({ timeout: 10000 });
    await expect(errorCard.getByText(/error|no se pudo cargar/i)).toBeVisible();
  });

  test('debe manejar error 500 de la API', async ({ page }) => {
    await page.route('**/api/v1/crypto**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'CRYPTO_PROVIDER_ERROR',
          message: 'Servidor no disponible',
        }),
      });
    });
    
    await page.goto('/market');
    
    // Tu código muestra .state-error en market.ts
    const errorCard = page.locator('.state-error');
    await expect(errorCard).toBeVisible();
    await expect(errorCard.getByText(/error/i)).toBeVisible();
  });
});

test.describe('Edge Cases - Input inválido', () => {
  test('debe manejar búsqueda con caracteres especiales', async ({ page }) => {
    await page.goto('/market');
    const searchInput = page.locator('input[placeholder*="bitcoin" i]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('<script>alert("xss")</script>');
      await page.keyboard.press('Enter');
      
      // La app no debe romperse
      await expect(page.getByRole('heading', { name: /market/i })).toBeVisible();
    }
  });
});
