# CryptoFin Architect — High-Performance Financial Intelligence Platform

[![Reactivity](https://img.shields.io/badge/Reactivity-Signals%20%26%20rxResource-red?style=for-the-badge)](#arquitectura)
[![Framework](https://img.shields.io/badge/Framework-AnalogJS-orange?style=for-the-badge)](#stack-tecnico)
[![Backend](https://img.shields.io/badge/BFF-Nitro-blue?style=for-the-badge)](#stack-tecnico)
[![SSR](https://img.shields.io/badge/Rendering-SSR%20%7C%20Hydration-brightgreen?style=for-the-badge)](#performance)

**CryptoFin Architect** es una aplicación de inteligencia y analítica financiera orientada a criptomonedas de alto rendimiento. Desarrollada con **Angular 21** (usando reactividad zoneless nativa) y el meta-framework **AnalogJS** impulsado por **Vite**, la plataforma emplea un patrón de diseño **BFF (Backend-for-Frontend)** montado sobre el motor **Nitro** para optimizar la ingesta de datos de APIs externas, mitigar riesgos de CORS e implementar almacenamiento en caché de baja latencia.

---

## Arquitectura y Flujo de Datos

El diseño segrega de forma rígida la visualización del cliente y la manipulación de datos sensibles mediante una arquitectura BFF. El flujo de datos reactivo y seguro está organizado de la siguiente manera:

```mermaid
graph TD
    %% Client Context
    subgraph Client ["Client Side (Angular 21 & Signals)"]
        Router["Router / URL Query Params"] <-->|Bi-directional Sync| StateService["NewsUiStateService (Signals)"]
        NewsPage["NewsPage (Smart Container)"] -->|computed params| NewsResource["newsResource (rxResource)"]
        MarketPage["MarketPage (Smart Container)"] -->|computed params| MarketResource["marketResource / historyResource"]
        
        %% Presentation
        NewsResource -->|Articles| NewsCard["NewsArticleCardComponent"]
        MarketResource -->|Quotes & History| MarketChart["MarketComparisonChartComponent"]
        MarketResource -->|Pending Quotes| SkeletonCard["MarketCoinCardComponent (Skeleton State)"]
        MarketResource -->|Loaded Quotes| ActiveCard["MarketCoinCardComponent (Active State)"]
        
        %% User Interaction
        SearchInput["CoinExplorerPanelComponent (Search Input)"] -->|resolveCoinId() / Tickers & Names| MarketPage
    end

    %% Network Boundary
    Client -->|HTTP Requests / Local API| BFF["Nitro BFF (Server Router)"]

    %% Server Context
    subgraph BFF_Nitro ["Server Side (Nitro BFF Proxy)"]
        BFF -->|GET /api/v1/news| NewsHandler["news.get.ts (defineCachedEventHandler)"]
        BFF -->|GET /api/v1/crypto| CryptoHandler["crypto.get.ts"]
        BFF -->|GET /api/v1/healthz| HealthHandler["healthz.get.ts"]
        
        %% Mocks and Providers
        NewsHandler -->|E2E_MOCK_API = true| MockFixtures["e2e-api-fixtures.ts (Spanish Mocks)"]
        NewsHandler -->|E2E_MOCK_API = false| NewsProvider["newsapi.provider.ts (X-Api-Key Header)"]
        CryptoHandler -->|E2E_MOCK_API = true| MockFixtures
        CryptoHandler -->|E2E_MOCK_API = false| CryptoProvider["coingecko.provider.ts"]
    end

    %% External APIs
    NewsProvider -->|Secure HTTPS Header Key| NewsAPI["External NewsAPI"]
    CryptoProvider -->|REST Query| CoinGecko["External CoinGecko API"]
```

### Estructura y Patrones Arquitectónicos
*   **BFF (Backend-For-Frontend)**: La capa de presentación del cliente nunca interactúa directamente con APIs externas. Toda llamada se canaliza a través de sub-rutas del servidor Nitro, aislando secretos del lado del servidor y previniendo problemas de CORS.
*   **Presenters & Containers**: Separación estricta de responsabilidades (SOLID). Las páginas de ruta (`market.ts`, `news.ts`) actúan como controladores lógicos que manejan queries, inyectan servicios y gestionan recursos, mientras que la renderización visual se delega en componentes puros como `NewsArticleCardComponent`, `MarketCoinCardComponent` y `CoinExplorerPanelComponent`.
*   **Reactividad Basada en Recursos**: Consumo de flujos de datos asíncronos mediante `rxResource` y `computed`, permitiendo derivar el estado de la UI directamente de los cambios en los signals de búsqueda de forma limpia y declarativa (RxJS Debounce).

---

## Decisiones Técnicas Clave (ADR)

### [ADR-001] Aislamiento de Entornos en Pruebas (Vitest Workspaces)
*   **Contexto:** Compilar componentes con `@analogjs/platform` dentro de pruebas de componentes unitarios generaba colisiones en la resolución de alias de Nitro y dependencias del enrutador SSR.
*   **Decisión:** Separar las suites usando proyectos en `vitest.config.ts`.
    *   **Proyecto `client`:** Corre en `jsdom` y carga `src/test-setup.ts` para pruebas de TestBed. Compila componentes usando transpilación limpia de esbuild (JIT), evitando plugins intrusivos.
    *   **Proyecto `server`:** Corre en `node` puro, permitiendo simular e interceptar módulos asíncronos (`vi.mock('#imports')`) sin pasar por la optimización de código de Vite.

### [ADR-002] Seguridad de Secretos en Cabeceras (OWASP Compliance)
*   **Contexto:** Las llaves de API enviadas como query parameters (`/everything?apiKey=...`) son propensas a quedar registradas en logs de proxies, historiales y cabeceras de referers.
*   **Decisión:** Reconfigurar el flujo hacia NewsAPI en `newsapi.provider.ts` para inyectar la credencial de forma segura a través de la cabecera HTTP `X-Api-Key`, enmascarando fallos del lado del servidor bajo códigos HTTP 503 sin divulgar variables de entorno privadas.

### [ADR-003] Sincronización y Debounce Reactivo
*   **Contexto:** Los efectos de sincronización que dependen de temporizadores imperativos (`setTimeout`) causaban desfases lógicos y bucles de renderizado.
*   **Decisión:** Implementar flujos reactivos basados en `toObservable` y operadores clásicos de RxJS (`debounceTime(350)`, `distinctUntilChanged()`) acotados bajo el ciclo de vida del componente mediante `takeUntilDestroyed(DestroyRef)`.

### [ADR-004] Persistencia Global del Estado (WatchlistService con LocalStorage)
*   **Contexto:** Al navegar entre páginas o recargar, la selección de monedas del usuario y el idioma elegido se perdían, forzando una reconfiguración manual constante y generando una experiencia de usuario fragmentada.
*   **Decisión:** Crear un servicio centralizado `WatchlistService` (`@Injectable({ providedIn: 'root' })`) que exponga dos signals reactivos: `selectedCoins` y `language`. Ambos cargan su estado inicial de `localStorage` al arrancar (con fallbacks a `['bitcoin', 'ethereum']` y `'en'` respectivamente) y utilizan `effect()` en el constructor para persistir automáticamente cada cambio. La página de mercado sincroniza la URL con el servicio: si la URL contiene `?coins=...`, actualiza el servicio; si no, redirige añadiendo la query persistida. Esto garantiza que la watchlist y el idioma sobreviven recargas, navegación y cierres de sesión sin acoplar las rutas al almacenamiento directo.

### [ADR-005] Resolución Declarativa de Búsquedas Multi-Moneda y Debounce
*   **Contexto:** Los usuarios necesitaban comparar noticias de múltiples criptomonedas simultáneamente, pero la búsqueda solo aceptaba un término a la vez. Además, el debounce aplicado a todos los filtros (idioma, fechas, tamaño de página) introducía lag innecesario en controles que deberían ser instantáneos.
*   **Decisión:**
    *   **Búsqueda multi-moneda con OR:** Implementar un sistema de chips toggle en la UI de noticias donde cada clic alterna un término en una consulta compuesta separada por ` OR ` (ej: `bitcoin OR ethereum OR solana`). Se impone un límite de 3 términos simultáneos para mantener la relevancia de resultados. Los chips seleccionados permanecen siempre visibles en el panel de sugerencias para permitir su deselección.
    *   **Separadores flexibles:** Los mocks del servidor y la lógica de parsing aceptan comas, puntos y comas, y el operador `OR` como delimitadores (`/(?:\s+or\s+|,|;)/i`), haciendo que `bitcoin, ethereum` y `bitcoin; solana` funcionen como consultas multi-moneda válidas.
    *   **Debounce selectivo:** Solo el campo de texto de búsqueda aplica `debounceTime(350)` vía `toObservable`. Los demás filtros (idioma, fechas, pageSize, paginación) utilizan navegación inmediata a través de un helper `navigateWith()` que preserva y actualiza los query params existentes, eliminando el lag percibido en cambios de filtros.

---

## Stack Técnico

*   **Angular 21**: Componentes reactivos Zoneless, Signals, `@defer` y `rxResource`.
*   **AnalogJS**: Meta-framework fullstack con rutas basadas en archivos y SSR.
*   **Vite**: Motor de compilación rápido e integración de CSS mediante TailwindCSS v4.
*   **ApexCharts / Ng-ApexCharts**: Graficación interactiva de cotizaciones de criptomonedas.
*   **Vitest**: Suite de tests unitarios rápidos estructurada en múltiples proyectos.
*   **Playwright**: Automatización y regresión E2E de Happy Path y Edge Cases.

---

## Instalación y Guía de Uso Local

### 1. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
*   Abre tu navegador en `http://localhost:5173/`

### 2. Ejecutar Pruebas Unitarias (Vitest)
```bash
npm run test
```
*   Ejecuta las 47 pruebas en paralelo, dividiendo entornos entre el cliente (`jsdom`) y el servidor (`node`).

### 3. Ejecutar Pruebas E2E (Playwright)
```bash
npm run test:e2e
```
*   Inicia el servidor dev mockeado localmente y ejecuta las pruebas de integración.

### 4. Compilar para Producción
```bash
# Compilación estándar
npm run build

# Compilación estática con destino a GitHub Pages
DEPLOY_TARGET=github-pages npm run build
```
