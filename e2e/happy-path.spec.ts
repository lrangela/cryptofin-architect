import { test, expect } from '@playwright/test';

/**
 * Happy Path - Tests básicos de UI
 * Verifican navegación directa y elementos de UI presentes
 */

test.describe('Happy Path - News', () => {
  test('debe cargar News y mostrar elementos básicos', async ({ page }) => {
    await page.goto('/news');
    await page.waitForLoadState('domcontentloaded');
    
    // Verificar heading principal
    await expect(page.getByRole('heading', { name: 'News', level: 1 })).toBeVisible();
    
    // Verificar buscador
    await expect(page.locator('input[type="search"]')).toBeVisible();
    
    // Verificar navegación
    await expect(page.getByRole('link', { name: 'News' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Market' })).toBeVisible();
  });
});

test.describe('Happy Path - Market', () => {
  test('debe cargar Market y mostrar elementos básicos', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('domcontentloaded');
    // Esperar para rate limiting de API en CI
    await page.waitForTimeout(8000);
    
    // Verificar heading principal
    await expect(page.getByRole('heading', { name: 'Market', level: 1 })).toBeVisible();
    
    // Verificar buscador
    await expect(page.locator('input[placeholder*="bitcoin" i]')).toBeVisible();
    
    // Verificar navegación
    await expect(page.getByRole('link', { name: 'News' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Market' })).toBeVisible();
  });

  test('debe permitir escribir en el buscador', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(8000);
    
    const searchInput = page.locator('input[placeholder*="bitcoin" i]');
    await searchInput.fill('test123');
    
    // Verificar que el input tiene el valor
    await expect(searchInput).toHaveValue('test123');
  });
});

test.describe('Navegación entre páginas', () => {
  test('debe navegar por URL entre Market y News', async ({ page }) => {
    // Ir a Market directamente
    await page.goto('/market');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(8000);
    await expect(page).toHaveURL(/\/market/, { timeout: 15000 });

    // Navegar a News directamente
    await page.goto('/news');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/news/, { timeout: 15000 });

    // Volver a Market directamente
    await page.goto('/market');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(8000);
    await expect(page).toHaveURL(/\/market/, { timeout: 15000 });
  });
});
