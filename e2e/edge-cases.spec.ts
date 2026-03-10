import { test, expect } from '@playwright/test';

/**
 * Tests de Edge Cases - UI states
 * Nota: Los tests de mocks de API no se incluyen porque las peticiones
 * son server-side (Analog SSR) y Playwright no puede interceptarlas.
 */

test.describe('Edge Cases - News UI', () => {
  test('debe mostrar estado inicial cuando no hay búsqueda', async ({ page }) => {
    await page.goto('/news');
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page.getByRole('heading', { name: 'Empieza una búsqueda' })).toBeVisible();
    await expect(page.getByText('Escribe un término para consultar noticias')).toBeVisible();
  });

  test('debe responder a input de búsqueda', async ({ page }) => {
    await page.goto('/news');
    await page.waitForLoadState('domcontentloaded');
    
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('test-xyz-123');
    await expect(searchInput).toHaveValue('test-xyz-123');
  });

  test('debe mostrar sugerencias de búsqueda', async ({ page }) => {
    await page.goto('/news');
    await page.waitForLoadState('domcontentloaded');
    
    // Verificar que el panel de sugerencias está presente
    await expect(page.getByText('TEMAS RELACIONADOS')).toBeVisible();
  });
});

test.describe('Edge Cases - Market UI', () => {
  test('debe mostrar tarjetas de mercado o mensaje de error', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('domcontentloaded');
    // Esperar más tiempo para recuperar de rate limiting de API en CI
    await page.waitForTimeout(8000);
    
    // Verificar que hay al menos una tarjeta visible O un mensaje de error
    // (por rate limiting de API en CI)
    const marketCards = page.locator('.market-card');
    const stateError = page.locator('.state-error');
    
    // Esperar a que algo se muestre
    await expect(
      marketCards.or(stateError).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('debe mostrar la navegación entre páginas', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(8000);
    
    await expect(page.getByRole('link', { name: 'News' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Market' })).toBeVisible();
  });
});
