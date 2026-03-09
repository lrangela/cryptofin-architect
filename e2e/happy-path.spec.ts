import { test, expect } from '@playwright/test';

test.describe('Happy Path - Flujo completo de usuario', () => {
  test('debe cargar la app, buscar cripto, mostrar gráfico y noticias', async ({ page }) => {
    // Al ser Analog y tener redirectTo: '/news', la URL debe ser /news
    await page.goto('/');
    await expect(page).toHaveURL(/\/news/, { timeout: 15000 });
    
    // Verificar que hay navegación disponible
    const marketLink = page.getByRole('link', { name: /market/i });
    await expect(marketLink).toBeVisible();
    
    // PASO 2: Navegar a la sección de Market
    await marketLink.click();
    await expect(page).toHaveURL(/\/market/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /market/i })).toBeVisible();
    
    // PASO 3: Buscar y seleccionar criptomoneda
    const searchInput = page.locator('input[placeholder*="bitcoin" i]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('solana');
    await searchInput.press('Enter');
    
    // Verificar que aparece en la lista de activos
    await expect(page.getByText(/solana/i).first()).toBeVisible({ timeout: 15000 });
    
    // PASO 4: Verificar aparición del gráfico
    const chartContainer = page.locator('app-market-comparison-chart');
    await expect(chartContainer).toBeVisible({ timeout: 20000 });
    
    // PASO 5: Volver a News
    const newsLink = page.getByRole('link', { name: /news/i });
    await newsLink.click();
    await expect(page).toHaveURL(/\/news/, { timeout: 10000 });
    
    // PASO 6: Verificar que la página de noticias responde
    const searchNews = page.locator('input[type="search"]');
    await expect(searchNews).toBeVisible();
  });
});

test.describe('Navegación entre páginas', () => {
  test('debe navegar correctamente entre Market y News', async ({ page }) => {
    await page.goto('/market');
    await expect(page).toHaveURL(/\/market/, { timeout: 15000 });
    
    await page.getByRole('link', { name: /news/i }).click();
    await expect(page).toHaveURL(/\/news/, { timeout: 15000 });
    
    await page.getByRole('link', { name: /market/i }).click();
    await expect(page).toHaveURL(/\/market/, { timeout: 15000 });
  });
});
