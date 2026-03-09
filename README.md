# CryptoFin Architect

[![CI](https://github.com/lrangela/cryptofin-architect/actions/workflows/ci.yml/badge.badge.svg)](https://github.com/lrangela/cryptofin-architect/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Live Demo:** [https://cryptofin-architect.vercel.app](https://cryptofin-architect.vercel.app) (Proyectado)

Portfolio-ready crypto intelligence dashboard built with **AnalogJS**, **Angular 21 (Signals & rxResource)**, and **TailwindCSS v4**. The application exposes a small BFF (Backend-For-Frontend) on top of external providers, keeps API keys on the server, and renders `/news` and `/market` from local Nitro API routes.

## Overview

- **Frontend:** Angular 21 (Zoneless-ready, Control Flow, `@defer` blocks) + AnalogJS file-based routing.
- **SSR/BFF runtime:** AnalogJS on Nitro.
- **State Management:** Custom Reactive State (`ResourceStateService`) using Signals and `rxResource`.
- **Server API:** `/api/v1/news`, `/api/v1/crypto`, `/api/v1/crypto/history`
- **Data providers:** NewsAPI and CoinGecko
- **Testing:** Vitest (Backend/Services) & Playwright (E2E & UI Edge Cases)
- **Delivery:** Docker + GitHub Actions CI

## Architecture

The app uses a strict BFF pattern so the browser never calls third-party providers directly, guaranteeing security and high performance.

```text
+------------------+        +----------------------------------+
| Browser / SSR UI | <----> | AnalogJS App (Angular + Nitro)  |
+------------------+        +----------------------------------+
                                     |             |
                                     |             |
                           +---------+             +------------------+
                           |                                            |
                           v                                            v
                  /api/v1/news                               /api/v1/crypto*
                           |                                            |
                           v                                            v
                       NewsAPI                                     CoinGecko API
```

`/api/v1/crypto*` covers both quote and history endpoints.

## Project Structure

```text
src/
  app/
    features/        # Domain-driven feature components
    pages/           # File-based Analog routing exports
    routes/          # Route logic & UI representation
    shared/          # Shared models, utils & State Services
  server/
    routes/api/v1/   # Nitro endpoints
    services/        # Internal server logic & Provider integrations
    tests/           # Backend Vitest specifications
e2e/                 # Playwright UI & Integration flows
```

## Technical Decisions

### ADR-001: BFF over direct client calls
- API keys stay on the server.
- Upstream payloads are normalized before reaching the UI.
- Provider failures are translated into stable local error contracts.

### ADR-002: Single caching layer
- Caching is handled only at Nitro route level through `defineCachedEventHandler`.
- Route TTLs are explicit and per-endpoint.

### ADR-003: Modern Reactive UI with Angular 21
- **Signals First:** State is managed entirely via Signals (`computed`, `effect`) ensuring optimized rendering.
- **rxResource:** Used to bridge standard HTTP Observables into the synchronous UI reactivity loop.
- **@defer Blocks:** Heavy UI elements (like `ApexCharts`) and grids are loaded lazily utilizing `@defer (on viewport)`, improving Initial Load Time and FCP.
- **Resource State Service:** An abstraction (`createResourceState`) manages explicit UI states (`idle`, `loading`, `success`, `error`) preventing unexpected layout shifts.

## Requirements

- Node.js `>=20.19.1`
- npm `>=10`

## Local Setup

1. Install dependencies:
```bash
npm ci
```

2. Create local environment file:
```bash
cp .env.example .env
```

3. Run the app:
```bash
npm run dev
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Starts Analog/Vite dev server |
| `npm run build` | Builds SSR client and server bundles |
| `npm run test` | Runs Vitest once (Server & Logic) |
| `npm run test:e2e` | Runs Playwright End-to-End Tests |
| `npm run test:e2e:ui` | Runs Playwright tests with UI mode |

## API & Endpoints

- **`GET /api/v1/news`**: News search with query params (`q`, `language`, `from`, `to`, `pageSize`).
- **`GET /api/v1/crypto`**: Quotes for assets (`ids`).
- **`GET /api/v1/crypto/history`**: Asset historic data (`id`, `days`).

## Docker & CI/CD

**Docker:**
```bash
docker build -t cryptofin-architect .
docker run --env-file .env -p 8781:8781 cryptofin-architect
```

**CI Pipeline (GitHub Actions):**
- Validates Node Modules caching.
- Enforces Playwright dependencies.
- Executes Vitest & Playwright matrix tests against `.env` Secrets.
- Builds final SSR Artifact.
