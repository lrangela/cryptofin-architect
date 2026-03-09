import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp, eventHandler, toNodeListener } from 'h3';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('#imports', () => ({
  defineCachedEventHandler: <T>(handler: T) => handler,
}), { virtual: true });

const { getCoinGeckoQuotesMock } = vi.hoisted(() => ({
  getCoinGeckoQuotesMock: vi.fn(),
}));

vi.mock('../../../../services/crypto/coingecko.provider', () => ({
  CryptoProviderError: class CryptoProviderError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly errorCode: 'CRYPTO_PROVIDER_ERROR',
      message: string,
    ) {
      super(message);
    }
  },
  getCoinGeckoQuotes: getCoinGeckoQuotesMock,
}));

import { cryptoHandler } from '../../../routes/api/v1/crypto.get';

async function createTestUrl(handler: typeof cryptoHandler, route: string) {
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

describe('/api/v1/crypto', () => {
  afterEach(() => {
    getCoinGeckoQuotesMock.mockReset();
  });

  it('returns 400 when ids is missing', async () => {
    const { server, url } = await createTestUrl(cryptoHandler, '/api/v1/crypto');

    try {
      const response = await fetch(url);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        errorCode: 'CRYPTO_IDS_REQUIRED',
        message: 'Query parameter "ids" is required.',
      });
      expect(getCoinGeckoQuotesMock).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error | null) => (error ? reject(error) : resolve()));
      });
    }
  });
});
