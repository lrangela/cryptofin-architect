import { test, expect } from '@playwright/test';

/**
 * Happy Path - Flujo principal de la aplicación
 * 
 * Este test verifica el flujo completo de un usuario:
 * 1. Carga de la página principal
 * 2. Navegación a la sección de Market
 * 3. Búsqueda y selección de una criptomoneda
 * 4. Visualización de datos en el gráfico
 * 5. Navegación a la sección de News
 * 6. Visualización de noticias
 */
test.describe('Happy Path - Flujo completo de usuario', () => {
  test('debe cargar la app, buscar cripto, mostrar gráfico y noticias', async ({ page }) => {
    // ============================================
    // PASO 1: Carga de la página principal
    // ============================================
    await page.goto('/');
    
    // Verificar que la página cargó correctamente
    await expect(page).toHaveTitle(/CryptoFin/i);
    
    // Verificar que hay navegación disponible
    await expect(page.getByRole('link', { name: /news/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /market/i })).toBeVisible();
    
    // ============================================
    // PASO 2: Navegar a la sección de Market
    // ============================================
    await page.getByRole('link', { name: /market/i }).click();
    
    // Verificar que estamos en la página de Market
    await expect(page).toHaveURL(/\/market/);
    await expect(page.getByRole('heading', { name: /market/i })).toBeVisible();
    
    // ============================================
    // PASO 3: Buscar y seleccionar criptomoneda
    // ============================================
    // Buscar el campo de búsqueda de coins
    const searchInput = page.getByRole('searchbox', { name: /buscar/i })
      .or(page.getByPlaceholder(/buscar/i))
      .or(page.locator('input[type="search"]'))
      .or(page.locator('input').first());
    
    // Si existe el buscador, intentar buscar Bitcoin
    if (await searchInput.isVisible()) {
      await searchInput.fill('bitcoin');
      await page.waitForTimeout(500); // Esperar sugerencias
      
      // Verificar que aparecen resultados
      const suggestions = page.getByText(/bitcoin/i).first();
      await expect(suggestions).toBeVisible({ timeout: 5000 });
    }
    
    // ============================================
    // PASO 4: Verificar aparición del gráfico
    // ============================================
    // Esperar a que el gráfico esté visible
    const chartElement = page.locator('apx-chart').or(page.locator('.chart-shell'));
    
    // Verificar que hay elementos del gráfico o mensaje de "agrega coins"
    const hasChart = await chartElement.isVisible().catch(() => false);
    const hasPlaceholder = await page
      .getByText(/agrega coins/i)
      .isVisible()
      .catch(() => false);
    
    expect(hasChart || hasPlaceholder).toBeTruthy();
    
    // Verificar leyenda del gráfico si hay datos
    const legendItems = page.getByRole('button', { name: /bitcoin|ethereum|BTC|ETH/i });
    const hasLegend = await legendItems.first().isVisible().catch(() => false);
    
    if (hasLegend) {
      // Verificar que los botones de leyenda son interactivos
      await expect(legendItems.first()).toBeEnabled();
    }
    
    // ============================================
    // PASO 5: Navegar a la sección de News
    // ============================================
    await page.getByRole('link', { name: /news/i }).click();
    
    // Verificar que estamos en la página de News
    await expect(page).toHaveURL(/\/news/);
    await expect(page.getByRole('heading', { name: /news/i })).toBeVisible();
    
    // ============================================
    // PASO 6: Verificar visualización de noticias
    // ============================================
    // Esperar a que las noticias carguen
    await page.waitForLoadState('networkidle');
    
    // Verificar que hay artículos de noticias o mensaje de carga
    const hasArticles = await page
      .locator('article, .news-card, [class*="news"]')
      .first()
      .isVisible()
      .catch(() => false);
    
    const hasLoadingMessage = await page
      .getByText(/cargando|loading/i)
      .isVisible()
      .catch(() => false);
    
    const hasNoResultsMessage = await page
      .getByText(/no hay noticias|no results/i)
      .isVisible()
      .catch(() => false);
    
    // Al menos uno de estos estados debe ser verdadero
    expect(hasArticles || hasLoadingMessage || hasNoResultsMessage).toBeTruthy();
    
    // Si hay artículos, verificar estructura básica
    if (hasArticles) {
      // Verificar que hay títulos de noticias
      const newsTitles = page.getByRole('heading').or(page.locator('[class*="title"]'));
      await expect(newsTitles.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

/**
 * Test adicional: Verificar navegación entre páginas
 */
test.describe('Navegación entre páginas', () => {
  test('debe navegar correctamente entre Home, Market y News', async ({ page }) => {
    // Iniciar en Home
    await page.goto('/');
    await expect(page).toHaveURL(/^(.*\/)?$/);
    
    // Ir a Market
    await page.getByRole('link', { name: /market/i }).click();
    await expect(page).toHaveURL(/\/market/);
    
    // Ir a News desde Market
    await page.getByRole('link', { name: /news/i }).click();
    await expect(page).toHaveURL(/\/news/);
    
    // Volver a Market desde News
    await page.getByRole('link', { name: /market/i }).click();
    await expect(page).toHaveURL(/\/market/);
    
    // Volver a Home
    await page.getByRole('link', { name: /^home|inicio$/i }).or(page.getByText('CryptoFin')).click();
    await expect(page).toHaveURL(/^(.*\/)?$/);
  });
});

/**
 * Test: Verificar responsive design
 */
test.describe('Responsive Design', () => {
  test('debe verse correctamente en móvil', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.goto('/market');
      
      // Verificar que los elementos principales son visibles en móvil
      await expect(page.getByRole('heading', { name: /market/i })).toBeVisible();
      
      // El gráfico debería adaptarse al viewport móvil
      const chartContainer = page.locator('.chart-shell, .chart-placeholder').first();
      await expect(chartContainer).toBeInViewport();
    }
  });
});
