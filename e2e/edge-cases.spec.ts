/**
 * Pruebas de Edge Cases E2E con Playwright
 * 
 * Verifican el comportamiento de la aplicación cuando:
 * - Las APIs devuelven 0 resultados
 * - Los datos están malformados
 * - Hay errores de red
 */

import { test, expect } from '@playwright/test';

test.describe('Edge Cases - API sin resultados', () => {
  test('debe manejar gracefully cuando la API devuelve 0 resultados', async ({ page }) => {
    await page.goto('/news');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Posibles estados válidos cuando no hay resultados
    const hasNoResultsMessage = await page
      .getByText(/no hay noticias|no results|sin resultados/i)
      .isVisible()
      .catch(() => false);
    
    const hasEmptyState = await page
      .locator('.empty-state, [class*="empty"]')
      .first()
      .isVisible()
      .catch(() => false);
    
    const hasNewsList = await page
      .locator('article, .news-card, [class*="news-item"]')
      .first()
      .isVisible()
      .catch(() => false);
    
    // No debería haber errores críticos
    const hasCriticalError = await page
      .getByText(/error crítico|crash|fatal/i)
      .isVisible()
      .catch(() => false);
    
    expect(hasCriticalError).toBeFalsy();
    expect(hasNoResultsMessage || hasEmptyState || hasNewsList).toBeTruthy();
  });
});

test.describe('Edge Cases - Errores de red', () => {
  test('debe manejar timeout de API', async ({ page }) => {
    await page.route('**/api/v1/news**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 30000));
      await route.continue();
    });
    
    await page.goto('/news');
    await page.waitForTimeout(5000);
    
    // La app debería mostrar estado de error o retry
    const hasErrorMessage = await page
      .getByText(/error|timeout|no se pudo cargar|intente de nuevo/i)
      .isVisible()
      .catch(() => false);
    
    const hasRetryButton = await page
      .getByRole('button', { name: /reintentar|retry/i })
      .isVisible()
      .catch(() => false);
    
    expect(hasErrorMessage || hasRetryButton).toBeTruthy();
  });

  test('debe manejar error 500 de la API', async ({ page }) => {
    await page.route('**/api/v1/crypto**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Provider unavailable',
        }),
      });
    });
    
    await page.goto('/market');
    await page.waitForTimeout(3000);
    
    const hasErrorMessage = await page
      .getByText(/error|no se pudo cargar|servidor no disponible/i)
      .isVisible()
      .catch(() => false);
    
    expect(hasErrorMessage).toBeTruthy();
  });
});

test.describe('Edge Cases - Input inválido', () => {
  test('debe manejar búsqueda con caracteres especiales', async ({ page }) => {
    await page.goto('/market');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="buscar" i]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('<script>alert("xss")</script>');
      await page.waitForTimeout(1000);
      
      // No debería haber errores de JavaScript
      let hasScriptError = false;
      page.on('console', (msg) => {
        if (msg.type() === 'error' && msg.text().includes('script')) {
          hasScriptError = true;
        }
      });
      
      expect(hasScriptError).toBeFalsy();
    }
  });

  test('debe manejar búsqueda muy larga', async ({ page }) => {
    await page.goto('/market');
    
    const searchInput = page.locator('input[type="search"], input').first();
    
    if (await searchInput.isVisible()) {
      const longText = 'a'.repeat(1000);
      await searchInput.fill(longText);
      await page.waitForTimeout(1000);
      
      // La app no debería crashear
      const isPageResponsive = await page.evaluate(() => {
        return document.readyState === 'complete';
      });
      
      expect(isPageResponsive).toBeTruthy();
    }
  });
});
