# Configuración de Secrets para GitHub Actions

Este documento describe cómo configurar las variables de entorno seguras necesarias para el CI/CD de CryptoFin Architect.

## 🔐 Secrets Requeridos

Configura los siguientes secrets en tu repositorio de GitHub:

### Pasos para configurar:

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Secrets and variables** > **Actions**
4. Click en **New repository secret**
5. Agrega cada secret uno por uno

### Secrets necesarios:

| Nombre del Secret | Valor | Descripción | Requerido |
|-------------------|-------|-------------|-----------|
| `NEWSAPI_KEY` | Tu API key de NewsAPI | Clave para obtener noticias de criptomonedas | ✅ Sí |
| `NEWSAPI_BASE_URL` | `https://newsapi.org/v2/` | URL base del proveedor de noticias | ❌ No (tiene default) |
| `COINGECKO_BASE` | `https://api.coingecko.com/api/v3` | URL base de CoinGecko | ❌ No (tiene default) |
| `COINGECKO_VS_CURRENCY` | `usd` | Moneda de referencia para precios | ❌ No (tiene default) |
| `RAPID_NEWS_HOST` | `crypto-news16.p.rapidapi.com` | Host de RapidAPI para noticias alternativas | ❌ No (opcional) |
| `RAPID_NEWS_KEY` | Tu API key de RapidAPI | Clave para proveedor alternativo de noticias | ❌ No (opcional) |

## 📝 Obtención de API Keys

### NewsAPI

1. Ve a [https://newsapi.org/](https://newsapi.org/)
2. Click en "Get API Key"
3. Regístrate con tu email
4. Copia tu API key y pégala en el secret `NEWSAPI_KEY`

**Nota:** La versión gratuita solo permite desarrollo localhost. Para producción necesitarás un plan pago.

### RapidAPI (Opcional)

1. Ve a [https://rapidapi.com/](https://rapidapi.com/)
2. Busca "crypto-news16"
3. Suscríbete al API (hay plan gratuito)
4. Copia tu clave y pégala en `RAPID_NEWS_KEY`

## 🧪 Desarrollo Local vs CI/CD

### Desarrollo Local
- Usa el archivo `.env` en la raíz del proyecto
- Copia `.env.example` a `.env` y llena tus keys
- Los tests locales leerán de `.env` gracias a `dotenv` en `vitest.config.ts`

```bash
cp .env.example .env
# Edita .env con tus keys
npm run dev
```

### CI/CD (GitHub Actions)
- Las variables se inyectan automáticamente desde GitHub Secrets
- No se necesita archivo `.env` en el repositorio
- El workflow `ci.yml` usa `${{ secrets.NOMBRE_SECRET }}`

## 🚨 Seguridad

- **NUNCA** hagas commit de tu archivo `.env`
- El archivo `.env` está en `.gitignore`
- Rota tus API keys si alguna vez se exponen públicamente
- Usa diferentes keys para desarrollo y producción si es posible

## ✅ Verificación

Después de configurar los secrets:

1. Haz un push a tu repositorio
2. Ve a la pestaña **Actions** en GitHub
3. El workflow debería ejecutarse exitosamente
4. Los tests deberían pasar con las variables de entorno configuradas

## 📄 Archivos Modificados

Estos archivos fueron actualizados para soportar la configuración de secrets:

- `.github/workflows/ci.yml` - Usa secrets en los pasos de Test y Build
- `.env.example` - Template seguro sin keys reales
- `vitest.config.ts` - Carga `.env` para desarrollo local
- `Dockerfile` - Healthcheck para producción
- `package.json` - Agrega `dotenv` como devDependency

## 📊 Workflow de CI/CD

El workflow `.github/workflows/ci.yml` incluye:

1. **Checkout** - Descarga el código
2. **Setup Node** - Configura Node.js 20.19.1
3. **Cache node_modules** - Caché de dependencias
4. **Install** - Instala dependencias
5. **Install Playwright** - Instala navegadores para E2E
6. **Test (Server)** - Ejecuta tests del servidor
7. **Test (E2E)** - Ejecuta tests de Playwright
8. **Upload Playwright Report** - Sube reporte de tests E2E
9. **Build** - Compila para producción
10. **Upload build artifact** - Sube el build

### Tests E2E en CI

Los tests E2E se ejecutan con:
- `CI: true` para comportamiento específico de CI
- 2 reintentos automáticos para tests fallidos
- Solo Chromium (más rápido)
- Screenshots y videos en fallos
- Reporte HTML disponible como artifact
