import { test, expect } from '@playwright/test';

test.describe('Happy Path - Flujo completo de usuario', () => {
  test('debe cargar la app, buscar cripto, mostrar gráfico y noticias', async ({ page }) => {
    // PASO 1: Carga de la página principal (que redirige a /news)
    await page.goto('/');
    
    // Al ser Analog y tener redirectTo: '/news', la URL debe ser /news
    await expect(page).toHaveURL(/\/news/);
    
    // Verificar que hay navegación disponible
    await expect(page.getByRole('link', { name: /news/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /market/i })).toBeVisible();
    
    // PASO 2: Navegar a la sección de Market
    await page.getByRole('link', { name: /market/i }).click();
    await expect(page).toHaveURL(/\/market/);
    await expect(page.getByRole('heading', { name: /market/i })).toBeVisible();
    
    // PASO 3: Buscar y seleccionar criptomoneda
    const searchInput = page.locator('input[placeholder*="bitcoin" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('solana');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      
      // Verificar que aparece en la lista de activos
      await expect(page.getByText(/solana/i).first()).toBeVisible();
    }
    
    // PASO 4: Verificar aparición del gráfico
    // El componente usa @defer, esperamos a que cargue
    const chartContainer = page.locator('app-market-comparison-chart');
    await expect(chartContainer).toBeVisible({ timeout: 15000 });
    
    // PASO 5: Volver a News
    await page.getByRole('link', { name: /news/i }).click();
    await expect(page).toHaveURL(/\/news/);
    
    // PASO 6: Verificar visualización de noticias
    await page.waitForLoadState('networkidle');
    const newsGrid = page.locator('.news-grid');
    const stateCard = page.locator('.state-card');
    
    // Al menos uno debe ser visible (noticias cargadas o mensaje de búsqueda)
    const isVisible = await newsGrid.isVisible() || await stateCard.isVisible();
    expect(isVisible).toBeTruthy();
  });
});

test.describe('Navegación entre páginas', () => {
  test('debe navegar correctamente entre Market y News', async ({ page }) => {
    await page.goto('/market');
    await expect(page).toHaveURL(/\/market/);
    
    await page.getByRole('link', { name: /news/i }).click();
    await expect(page).toHaveURL(/\/news/);
    
    await page.getByRole('link', { name: /market/i }).click();
    await expect(page).toHaveURL(/\/market/);
  });
});
