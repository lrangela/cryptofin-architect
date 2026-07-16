import { test, expect, devices } from '@playwright/test';

test.describe('Mobile UI/UX Audit - CryptoFin Architect', () => {
  
  test('iPhone 15 Pro - Market Grid and Cards', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 15 Pro'],
      viewport: { width: 393, height: 852 }
    });
    const page = await context.newPage();
    
    console.log('\n=== AUDITORÍA iPhone 15 Pro (393x852) ===\n');
    
    // Navegar a Market
    await page.goto('http://localhost:5173/market');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Screenshot completo
    await page.screenshot({ 
      path: 'e2e/screenshots/iphone15-market-full.png', 
      fullPage: true 
    });
    
    // Análisis de viewport y overflow
    const viewportAnalysis = await page.evaluate(() => {
      const bodyWidth = document.body.scrollWidth;
      const viewportWidth = window.innerWidth;
      const hasHorizontalOverflow = bodyWidth > viewportWidth;
      
      return {
        viewport: { width: viewportWidth, height: window.innerHeight },
        bodyWidth,
        hasHorizontalOverflow,
        overflowAmount: bodyWidth - viewportWidth
      };
    });
    
    console.log('Viewport Analysis:', JSON.stringify(viewportAnalysis, null, 2));
    
    // Verificar que NO hay overflow horizontal
    expect(viewportAnalysis.hasHorizontalOverflow).toBe(false);
    
    // Análisis de tarjetas de mercado
    const marketCardsAnalysis = await page.evaluate(() => {
      const cards = document.querySelectorAll('app-market-coin-card');
      const viewportWidth = window.innerWidth;
      
      const cardData = Array.from(cards).map((card, index) => {
        const rect = card.getBoundingClientRect();
        const priceBadge = card.querySelector('.price-badge, [class*="price-badge"]');
        const title = card.querySelector('h2');
        const styles = window.getComputedStyle(card);
        
        return {
          index,
          dimensions: {
            width: rect.width,
            height: rect.height,
            overflowsViewport: rect.width > viewportWidth
          },
          elements: {
            hasPriceBadge: !!priceBadge,
            priceBadgeOverflows: priceBadge ? 
              priceBadge.getBoundingClientRect().right > viewportWidth : false,
            hasTitle: !!title,
            titleOverflows: title ?
              title.getBoundingClientRect().right > viewportWidth : false
          },
          styles: {
            display: styles.display,
            padding: styles.padding,
            gap: styles.gap,
            flexDirection: styles.flexDirection
          }
        };
      });
      
      return {
        totalCards: cards.length,
        cards: cardData
      };
    });
    
    console.log('\nMarket Cards Analysis:', JSON.stringify(marketCardsAnalysis, null, 2));
    
    // Verificar que las tarjetas no se desborden
    for (const card of marketCardsAnalysis.cards) {
      expect(card.dimensions.overflowsViewport).toBe(false);
      expect(card.elements.priceBadgeOverflows).toBe(false);
      expect(card.elements.titleOverflows).toBe(false);
    }
    
    // Análisis del panel "Explorar Monedas"
    const explorePanel = page.locator('[aria-label="Explorar Monedas"]');
    await explorePanel.screenshot({ path: 'e2e/screenshots/iphone15-explore-chips.png' });
    
    const chipsAnalysis = await page.evaluate(() => {
      const panel = document.querySelector('[aria-label="Explorar Monedas"]');
      if (!panel) return null;
      
      const chips = panel.querySelectorAll('button');
      const panelStyles = window.getComputedStyle(panel);
      
      const chipData = Array.from(chips).map((chip, index) => {
        const rect = chip.getBoundingClientRect();
        const chipStyles = window.getComputedStyle(chip);
        
        return {
          index,
          text: chip.textContent?.trim(),
          dimensions: {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
          },
          styles: {
            padding: chipStyles.padding,
            margin: chipStyles.margin
          }
        };
      });
      
      // Verificar row gap y column gap
      return {
        totalChips: chips.length,
        containerStyles: {
          display: panelStyles.display,
          flexWrap: panelStyles.flexWrap,
          gap: panelStyles.gap,
          rowGap: panelStyles.rowGap,
          columnGap: panelStyles.columnGap
        },
        chips: chipData
      };
    });
    
    console.log('\nExplore Chips Analysis:', JSON.stringify(chipsAnalysis, null, 2));
    
    // Verificar que hay suficiente separación entre chips
    if (chipsAnalysis && chipsAnalysis.chips.length > 1) {
      for (let i = 0; i < chipsAnalysis.chips.length - 1; i++) {
        const current = chipsAnalysis.chips[i];
        const next = chipsAnalysis.chips[i + 1];
        
        // Si están en la misma fila (similar top), verificar separación horizontal
        if (Math.abs(current.dimensions.top - next.dimensions.top) < 10) {
          const horizontalGap = next.dimensions.left - (current.dimensions.left + current.dimensions.width);
          console.log(`Gap entre chip ${i} y ${i+1}: ${horizontalGap}px`);
          // Debería haber al menos 8px de separación
          expect(horizontalGap).toBeGreaterThanOrEqual(8);
        }
      }
    }
    
    await context.close();
  });
  
  test('iPhone 15 Pro - News Grid and Touch Targets', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 15 Pro'],
      viewport: { width: 393, height: 852 }
    });
    const page = await context.newPage();
    
    console.log('\n=== AUDITORÍA News - iPhone 15 Pro ===\n');
    
    // Navegar a News
    await page.goto('http://localhost:5173/news');
    await page.waitForLoadState('networkidle');
    
    // Realizar una búsqueda para cargar noticias
    const searchBox = page.locator('.field-search input[type="search"]');
    await searchBox.fill('bitcoin');
    // Wait for debounced API call and results to render
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    
    // Screenshot (viewport only to avoid fullPage font-loading timeout)
    await page.screenshot({ 
      path: 'e2e/screenshots/iphone15-news-full.png'
    });
    
    // Análisis de tarjetas de noticias
    const newsAnalysis = await page.evaluate(() => {
      const newsCards = document.querySelectorAll('.news-card, article.news-card');
      
      const cardAnalysis = Array.from(newsCards).slice(0, 3).map((card, index) => {
        const sourceBadge = card.querySelector('.source-badge');
        const date = card.querySelector('.published-date');
        const title = card.querySelector('.news-card-title');
        const actionLink = card.querySelector('.read-more-link');
        
        const cardStyles = window.getComputedStyle(card);
        
        const touchTarget = actionLink ? {
          text: actionLink.textContent?.trim().substring(0, 20),
          width: actionLink.getBoundingClientRect().width,
          height: actionLink.getBoundingClientRect().height,
          meetsMinTouchTarget: actionLink.getBoundingClientRect().width >= 44 && actionLink.getBoundingClientRect().height >= 44,
        } : null;
        
        return {
          index,
          elements: {
            hasSourceBadge: !!sourceBadge,
            hasDate: !!date,
            hasTitle: !!title,
          },
          touchTarget,
          spacing: {
            padding: cardStyles.padding,
            gap: cardStyles.gap,
          }
        };
      });
      
      return {
        totalNewsCards: newsCards.length,
        sampleCards: cardAnalysis
      };
    });
    
    console.log('\nNews Cards Analysis:', JSON.stringify(newsAnalysis, null, 2));
    
    // Verificar que los enlaces "Read more" tienen un área táctil adecuada
    for (const card of newsAnalysis.sampleCards) {
      if (card.touchTarget) {
        console.log(`Touch target: "${card.touchTarget.text}" - ${card.touchTarget.width}x${card.touchTarget.height}px`);
        expect(card.touchTarget.meetsMinTouchTarget).toBe(true);
      }
    }
    
    await context.close();
  });
  
  test('iPhone 15 Pro - Navigation Header', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 15 Pro'],
      viewport: { width: 393, height: 852 }
    });
    const page = await context.newPage();
    
    console.log('\n=== AUDITORÍA Navegación - iPhone 15 Pro ===\n');
    
    await page.goto('http://localhost:5173/market');
    await page.waitForLoadState('networkidle');
    
    // Análisis de navegación y header
    const navAnalysis = await page.evaluate(() => {
      const pageShell = document.querySelector('.page-shell, [class*="page-shell"], main');
      const header = document.querySelector('h1');
      const nav = document.querySelector('nav');
      
      const pageShellStyles = pageShell ? window.getComputedStyle(pageShell) : null;
      const headerRect = header ? header.getBoundingClientRect() : null;
      
      return {
        pageShell: {
          paddingTop: pageShellStyles?.paddingTop,
          marginTop: pageShellStyles?.marginTop
        },
        header: {
          top: headerRect?.top,
          height: headerRect?.height,
          text: header?.textContent?.trim()
        },
        nav: {
          height: nav ? nav.getBoundingClientRect().height : null,
          top: nav ? nav.getBoundingClientRect().top : null
        }
      };
    });
    
    console.log('\nNavigation Analysis:', JSON.stringify(navAnalysis, null, 2));
    
    // Verificar que el header tiene suficiente padding superior
    // Debe estar alejado del borde superior para evitar colisiones con notch
    expect(navAnalysis.header.top).toBeGreaterThan(0);
    
    await context.close();
  });
  
  test('Pixel 7 - Responsive Layout', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    });
    const page = await context.newPage();
    
    console.log('\n=== AUDITORÍA Pixel 7 (412x915) ===\n');
    
    await page.goto('http://localhost:5173/market');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'e2e/screenshots/pixel7-market-full.png', 
      fullPage: true 
    });
    
    // Verificar overflow
    const overflow = await page.evaluate(() => {
      return {
        hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
        overflowAmount: document.body.scrollWidth - window.innerWidth
      };
    });
    
    console.log('Pixel 7 Overflow:', JSON.stringify(overflow, null, 2));
    expect(overflow.hasHorizontalOverflow).toBe(false);
    
    await page.goto('http://localhost:5173/news');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'e2e/screenshots/pixel7-news-full.png', 
      fullPage: true 
    });
    
    await context.close();
  });
  
  test('Pantalla Pequeña 320px - Layout Extremo', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 }
    });
    const page = await context.newPage();
    
    console.log('\n=== AUDITORÍA Pantalla Pequeña (320px) ===\n');
    
    await page.goto('http://localhost:5173/market');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'e2e/screenshots/small-320px-market-full.png', 
      fullPage: true 
    });
    
    const smallScreenAnalysis = await page.evaluate(() => {
      const cards = document.querySelectorAll('app-market-coin-card');
      const viewportWidth = window.innerWidth;
      
      return {
        viewport: { width: viewportWidth, height: window.innerHeight },
        hasHorizontalOverflow: document.body.scrollWidth > viewportWidth,
        overflowAmount: document.body.scrollWidth - viewportWidth,
        cardsCount: cards.length,
        cardsStack: Array.from(cards).every(card => 
          card.getBoundingClientRect().width <= viewportWidth
        )
      };
    });
    
    console.log('Small Screen Analysis:', JSON.stringify(smallScreenAnalysis, null, 2));
    
    // Verificar que las tarjetas se apilan correctamente
    expect(smallScreenAnalysis.cardsStack).toBe(true);
    expect(smallScreenAnalysis.hasHorizontalOverflow).toBe(false);
    
    await context.close();
  });
});
