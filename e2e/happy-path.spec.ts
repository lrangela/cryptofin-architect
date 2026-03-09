import { test, expect } from '@playwright/test';

test.describe('Happy Path - Flujo completo de usuario', () => {
  test('debe cargar la app, buscar cripto, mostrar gráfico y noticias', async ({ page }) => {
    // PASO 1: Carga de la página principal (que redirige a /news)
    await page.goto('/');
    
    // Esperar a que la hidratación termine y la URL sea estable
    await expect(page).toHaveURL(/\/news/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Verificar que hay navegación disponible
    const marketLink = page.getByRole('link', { name: /market/i });
    await expect(marketLink).toBeVisible();
    
    // PASO 2: Navegar a la sección de Market
    // Forzamos la navegación y esperamos a que el cambio de URL se complete
    await Promise.all([
      marketLink.click(),
      page.waitForURL(/\/market/, { timeout: 10000 })
    ]);
    
    await expect(page.getByRole('heading', { name: /market/i })).toBeVisible();
    
    // PASO 3: Buscar y seleccionar criptomoneda
    // Esperar a que el input sea interactuable
    const searchInput = page.locator('input[placeholder*="bitcoin" i]');
    await expect(searchInput).toBeVisible();
    await searchInput.click();
    await searchInput.fill('solana');
    await searchInput.press('Enter');
    
    // Verificar que aparece en la lista de activos (damos tiempo a la API local)
    await expect(page.getByText(/solana/i).first()).toBeVisible({ timeout: 10000 });
    
    // PASO 4: Verificar aparición del gráfico
    // El componente usa @defer, esperamos a que cargue
    const chartContainer = page.locator('app-market-comparison-chart');
    await expect(chartContainer).toBeVisible({ timeout: 15000 });
    
    // PASO 5: Volver a News
    const newsLink = page.getByRole('link', { name: /news/i });
    await Promise.all([
      newsLink.click(),
      page.waitForURL(/\/news/, { timeout: 10000 })
    ]);
    
    // PASO 6: Verificar visualización de noticias
    await page.waitForLoadState('networkidle');
    
    // Verificamos que al menos el shell de noticias o el estado inicial sea visible
    const newsGrid = page.locator('.news-grid');
    const stateCard = page.locator('.state-card');
    await expect(newsGrid.or(stateCard).first()).toBeVisible();
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
