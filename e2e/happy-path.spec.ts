import { test, expect } from '@playwright/test';

/**
 * Happy Path - Flujo básico de usuario
 * Tests simplificados para verificar navegación y UI básica
 */

test.describe('Happy Path - Navegación básica', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('debe redirigir a news desde la raíz', async ({ page }) => {
    await expect(page).toHaveURL(/\/news/, { timeout: 15000 });
  });

  test('debe mostrar la página de News', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'News', level: 1 })).toBeVisible();
    await expect(page.locator('input[type="search"]')).toBeVisible();
  });

  test('debe navegar a Market desde News', async ({ page }) => {
    const marketLink = page.getByRole('link', { name: /market/i });
    await expect(marketLink).toBeVisible();
    await marketLink.click();
    await expect(page).toHaveURL(/\/market/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Market', level: 1 })).toBeVisible();
  });
});

test.describe('Happy Path - Market', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('domcontentloaded');
    // Esperar más tiempo para recuperar de rate limiting de API en CI
    await page.waitForTimeout(5000);
  });

  test('debe mostrar el buscador de coins', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="bitcoin" i]');
    await expect(searchInput).toBeVisible();
  });

  test('debe permitir buscar una coin', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="bitcoin" i]');
    await searchInput.click(); // Click primero para asegurar focus
    await page.waitForTimeout(500);
    await searchInput.fill('ethereum');
    await page.waitForTimeout(500);
    // Verificar que el input tiene el valor (puede fallar por rate limiting)
    const value = await searchInput.inputValue();
    expect(value).toBe('ethereum');
  });

  test('debe mostrar la navegación entre páginas', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'News' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Market' })).toBeVisible();
  });
});

test.describe('Navegación entre páginas', () => {
  test('debe navegar correctamente entre Market y News', async ({ page }) => {
    // Ir a Market
    await page.goto('/market');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Esperar rate limiting
    await expect(page).toHaveURL(/\/market/, { timeout: 15000 });

    // Navegar a News
    await page.getByRole('link', { name: /news/i }).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/news/, { timeout: 15000 });

    // Navegar de vuelta a Market
    await page.getByRole('link', { name: /market/i }).click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Esperar rate limiting
    await expect(page).toHaveURL(/\/market/, { timeout: 15000 });
  });
});
