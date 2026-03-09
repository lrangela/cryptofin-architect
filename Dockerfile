FROM node:20.19.1-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20.19.1-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM node:20.19.1-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8781

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 8781

# Healthcheck para monitoreo del contenedor
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.get('http://localhost:' + (process.env.PORT || 8781) + '/', (r) => process.exit(r.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1));"

CMD ["node", "dist/analog/server/index.mjs"]
