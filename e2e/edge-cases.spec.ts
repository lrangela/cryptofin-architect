import { test, expect } from '@playwright/test';

/**
 * Tests de Edge Cases - UI states
 * Nota: Los tests de mocks de API no se incluyen porque las peticiones
 * son server-side (Analog SSR) y Playwright no puede interceptarlas.
 */

test.describe('Edge Cases - News UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/news');
    await page.waitForLoadState('domcontentloaded');
  });

  test('debe mostrar estado inicial cuando no hay búsqueda', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Empieza una búsqueda' })).toBeVisible();
    await expect(page.getByText('Escribe un término para consultar noticias')).toBeVisible();
  });

  test('debe responder a input de búsqueda', async ({ page }) => {
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('test-xyz-123');
    await expect(searchInput).toHaveValue('test-xyz-123');
  });

  test('debe mostrar sugerencias de búsqueda', async ({ page }) => {
    // Verificar que el panel de sugerencias está presente
    await expect(page.getByText('TEMAS RELACIONADOS')).toBeVisible();
  });
});

test.describe('Edge Cases - Market UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('domcontentloaded');
    // Esperar a que carguen los datos iniciales
    await page.waitForTimeout(2000);
  });

  test('debe mostrar tarjetas de mercado', async ({ page }) => {
    // Verificar que hay al menos una tarjeta visible
    await expect(page.locator('.market-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('debe mostrar la navegación entre páginas', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'News' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Market' })).toBeVisible();
  });
});
