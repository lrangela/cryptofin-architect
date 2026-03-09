import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp, eventHandler, toNodeListener } from 'h3';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock de Nitro #imports
vi.mock('#imports', () => ({
  defineCachedEventHandler: (handler: any) => handler,
}), { virtual: true });

// Mock del servicio de noticias (Corregida la ruta a 3 niveles: v1 -> api -> tests -> server)
const { getNewsMock } = vi.hoisted(() => ({
  getNewsMock: vi.fn(),
}));

vi.mock('../../../services/news/news.service', () => ({
  getNews: getNewsMock,
}));

import { newsHandler } from '../../../routes/api/v1/news.get';

async function createTestUrl(handler: any, route: string) {
  const app = createApp();
  app.use(route, eventHandler(handler));
  const server = createServer(toNodeListener(app));

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  return {
    server,
    url: `http://127.0.0.1:${address.port}${route}`,
  };
}

describe('/api/v1/news', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when q is missing', async () => {
    const { server, url } = await createTestUrl(newsHandler, '/api/v1/news');

    try {
      const response = await fetch(url);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.errorCode).toBe('NEWS_QUERY_REQUIRED');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('calls getNews with correct query params', async () => {
    getNewsMock.mockResolvedValue([]);
    const { server, url } = await createTestUrl(newsHandler, '/api/v1/news');

    try {
      const response = await fetch(`${url}?q=ethereum&language=es&pageSize=5`);
      expect(response.status).toBe(200);
      
      expect(getNewsMock).toHaveBeenCalledWith(expect.objectContaining({
        q: 'ethereum',
        language: 'es',
        pageSize: 5
      }));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('handles NewsProviderError correctly', async () => {
    getNewsMock.mockRejectedValue({
      name: 'NewsProviderError',
      statusCode: 429,
      errorCode: 'NEWS_RATE_LIMIT',
      message: 'Too many requests'
    });

    const { server, url } = await createTestUrl(newsHandler, '/api/v1/news');

    try {
      const response = await fetch(`${url}?q=bitcoin`);
      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.errorCode).toBe('NEWS_RATE_LIMIT');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
