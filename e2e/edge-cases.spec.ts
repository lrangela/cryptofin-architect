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
    await page.waitForLoadState('networkidle');
    
    // Escribir algo para disparar la búsqueda
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('test-query-no-results');
    
    // Esperar el debounce de 350ms + tiempo de proceso
    await page.waitForTimeout(1000);
    
    // Verificar que se muestra el mensaje de "Sin resultados" que está en tu código
    // Usamos un selector más flexible por si hay problemas de mayúsculas/minúsculas
    await expect(page.locator('text=/sin resultados|no se encontraron/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Edge Cases - Errores de red', () => {
  test('debe manejar timeout de API', async ({ page }) => {
    // Forzamos un error de timeout abortando la ruta
    await page.route('**/api/v1/news**', async (route) => {
      await route.abort('timedout');
    });
    
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="search"]').fill('timeout-test');
    
    // Tu código usa .state-error o .state-card para errores
    // Buscamos cualquier elemento que contenga texto de error
    const errorElement = page.locator('section').filter({ hasText: /error|no se pudo cargar/i });
    await expect(errorElement.first()).toBeVisible({ timeout: 15000 });
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
    await page.waitForLoadState('networkidle');
    
    // Verificamos que aparezca un estado de error
    const errorElement = page.locator('section').filter({ hasText: /error|no hubo datos/i });
    await expect(errorElement.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Edge Cases - Input inválido', () => {
  test('debe manejar búsqueda con caracteres especiales', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="bitcoin" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('<script>alert("xss")</script>');
      await page.keyboard.press('Enter');
      
      // La app no debe romperse
      await expect(page.getByRole('heading', { name: /market/i })).toBeVisible();
    }
  });
});
