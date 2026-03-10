import { test, expect } from '@playwright/test';

test.describe('Edge Cases - News UI', () => {
  test('debe mostrar estado inicial cuando no hay busqueda', async ({ page }) => {
    await page.goto('/news', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Empieza una búsqueda' })).toBeVisible();
    await expect(page.getByText('Escribe un término para consultar noticias')).toBeVisible();
  });

  test('debe mostrar el input de busqueda', async ({ page }) => {
    await page.goto('/news', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('input[type="search"]')).toBeVisible();
  });

  test('debe mostrar sugerencias de busqueda', async ({ page }) => {
    await page.goto('/news', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('TEMAS RELACIONADOS')).toBeVisible();
  });
});

test.describe('Edge Cases - Market UI', () => {
  test('debe mostrar tarjetas de mercado o mensaje de error', async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded' });

    const marketCards = page.locator('.market-card');
    const stateError = page.locator('.state-error');

    await expect(marketCards.or(stateError).first()).toBeVisible();
  });

  test('debe mostrar la navegacion entre paginas', async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: 'News' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Market' })).toBeVisible();
  });
});
