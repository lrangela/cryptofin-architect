# Guía de Pruebas y Calidad — CryptoFin Architect

Este documento detalla la suite de pruebas automatizadas y la estrategia de control de calidad implementada en el proyecto.

---

## 📋 Resumen de la Suite

| Tipo de Prueba | Framework | Entorno | Cobertura / Archivos | Estado | Comando |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pruebas Unitarias** | Vitest | `jsdom` (Cliente) | `src/app/**/*.spec.ts` | ✅ 27 tests | `npm run test` |
| **Pruebas de Servidor** | Vitest | `node` (BFF) | `src/server/**/*.spec.ts` | ✅ 20 tests | `npm run test` |
| **Pruebas E2E** | Playwright | Navegador | `e2e/**/*.spec.ts` | ✅ 15 tests | `npm run test:e2e` |

*   **Total de la Suite:** **62 pruebas exitosas** al 100%.

---

## 🧪 1. Pruebas Unitarias y de Integración Local (Vitest)

Las pruebas unitarias están segregadas en proyectos aislados dentro de `vitest.config.ts` para garantizar que las dependencias del lado del cliente y servidor no colisionen.

### A. Entorno del Cliente (`jsdom`)
Cubre la lógica de componentes, directivas y servicios en Angular 21, resolviendo de forma nativa la reactividad basada en signals.
*   `market-coins.spec.ts` (19 tests): Valida el parseo tolerante de parámetros de URL, traducción de tickers, mapeo de nombres descriptivos y la lógica de `resolveCoinId()`.
*   `news-ui-state.service.spec.ts` (7 tests): Valida la hidratación reactiva del estado de filtros, límites y control de paginación desde los parámetros de ruta.
*   `app.spec.ts` (1 test): Asegura la compilación e instanciación correcta de la raíz de la aplicación.

### B. Entorno del Servidor / BFF (`node`)
Verifica los controladores de rutas Nitro y los proveedores de datos externos.
*   `http.spec.ts` (10 tests): Valida la construcción segura de URLs de API, control de respuestas de red y formateador de errores HTTP.
*   `coingecko.provider.spec.ts` (3 tests) / `newsapi.provider.spec.ts` (3 tests): Pruebas de integración sobre los mapeadores de cotizaciones históricas y filtrado seguro de cabeceras de API.
*   `news.get.spec.ts` (3 tests) / `crypto.get.spec.ts` (1 test): Valida la respuesta HTTP de los controladores del BFF, control de caché persistente y manejo de errores 429 / 502.

---

## 🎭 2. Pruebas de Extremo a Extremo (Playwright E2E)

**Comando:** `npm run test:e2e`

Playwright levanta una instancia efímera de la aplicación y ejecuta flujos de interacción completos sobre un navegador Chromium headless.

### Escenarios Clave Verificados:
1.  **Happy Path de Navegación:** Transiciones entre `/news` y `/market` manteniendo el estado del watchlist sincronizado.
2.  **Carga y Skeletons de Watchlist:** Verificación de que al añadir una moneda se renderice instantáneamente un `.skeleton-card` animado previniendo el Layout Shift.
3.  **Búsqueda Multi-Moneda en Noticias:** Selección de múltiples tags en temas relacionados (ej. clicking Bitcoin + Ethereum) combinados mediante el conector `OR` (ej: `bitcoin OR ethereum`), validando que la API del backend filtre de forma correcta.
4.  **Manejo de Errores e Inestabilidad de Red:** Simulación de fallos HTTP (502 Bad Gateway y 429 Rate Limit) del proveedor para confirmar que la interfaz muestre mensajes legibles al usuario final en su idioma nativo.

---

## 🚀 Comandos de Ejecución

### Ejecutar Vitest
```bash
# Corrida única de todas las pruebas en paralelo
npm run test

# Modo interactivo (Watch)
npm run test:watch
```

### Ejecutar Playwright
```bash
# Corrida en terminal headless
npm run test:e2e

# Interfaz gráfica interactiva de Playwright
npm run test:e2e:ui
```
