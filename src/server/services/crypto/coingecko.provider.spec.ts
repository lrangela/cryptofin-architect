import { describe, expect, it, vi } from 'vitest';

const { httpMock } = vi.hoisted(() => ({
  httpMock: vi.fn(),
}));

vi.mock('../http', () => ({
  buildApiUrl: (baseUrl: string, path: string) =>
    new URL(path.startsWith('/') ? path.slice(1) : path, baseUrl).toString(),
  getHttpStatusCode: (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
      ? error.statusCode
      : 502,
  getServerEnv: () => ({
    COINGECKO_BASE: 'https://api.coingecko.com/api/v3',
    COINGECKO_SIMPLE_PRICE_PATH: '/simple/price',
    COINGECKO_MARKET_CHART_PATH: '/coins/{id}/market_chart',
    COINGECKO_VS_CURRENCY: 'usd',
  }),
  http: httpMock,
}));

import {
  getCoinGeckoHistory,
  getCoinGeckoQuotes,
  normalizeCoinGeckoHistoryPoints,
  normalizeCoinGeckoQuote,
} from './coingecko.provider';

describe('coingecko.provider', () => {
  const lastUpdated = new Date(1_709_462_400 * 1000).toISOString();

  it('normalizes quote payloads', () => {
    expect(
      normalizeCoinGeckoQuote('bitcoin', {
        usd: 102345.12,
        usd_24h_change: 4.56,
        last_updated_at: 1_709_462_400,
      }),
    ).toEqual({
      id: 'bitcoin',
      priceUsd: 102345.12,
      change24h: 4.56,
      lastUpdated,
    });
  });

  it('filters missing quote payloads from the provider response', async () => {
    httpMock.mockResolvedValueOnce({
      bitcoin: {
        usd: 61000,
        usd_24h_change: 2.1,
        last_updated_at: 1_709_462_400,
      },
      ethereum: {},
    });

    await expect(getCoinGeckoQuotes(['bitcoin', 'ethereum'])).resolves.toEqual([
      {
        id: 'bitcoin',
        priceUsd: 61000,
        change24h: 2.1,
        lastUpdated,
      },
    ]);
  });

  it('normalizes market chart points into ISO timestamps', async () => {
    httpMock.mockResolvedValueOnce({
      prices: [
        [1_709_462_400_000, 62000],
        [1_709_548_800_000, 63000],
      ],
    });

    await expect(getCoinGeckoHistory('bitcoin', 7)).resolves.toEqual({
      id: 'bitcoin',
      points: normalizeCoinGeckoHistoryPoints([
        [1_709_462_400_000, 62000],
        [1_709_548_800_000, 63000],
      ]),
    });
  });
});
