import { describe, expect, it, vi } from 'vitest';

const { httpMock } = vi.hoisted(() => ({
  httpMock: vi.fn(),
}));

vi.mock('../../http', () => ({
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
    NEWSAPI_BASE_URL: 'https://newsapi.org/v2/',
    NEWSAPI_KEY: 'test-key',
  }),
  http: httpMock,
}));

import {
  fetchNewsArticles,
  normalizeNewsArticle,
  NewsProviderError,
} from './newsapi.provider';

describe('newsapi.provider', () => {
  it('normalizes mojibake article fields', () => {
    const article = normalizeNewsArticle({
      source: { id: null, name: 'CoinDesk EspaÃ±ol' },
      author: null,
      title: 'El Salvador impulsa el bitcÃ³in',
      description: 'CrÃ­ticas y adopciÃ³n institucional.',
      url: 'https://example.com/news',
      urlToImage: null,
      publishedAt: '2026-03-03T10:00:00.000Z',
    });

    expect(article).toEqual({
      title: 'El Salvador impulsa el bitcóin',
      description: 'Críticas y adopción institucional.',
      url: 'https://example.com/news',
      imageUrl: undefined,
      source: 'CoinDesk Español',
      publishedAt: '2026-03-03T10:00:00.000Z',
    });
  });

  it('maps provider payload into normalized articles', async () => {
    httpMock.mockResolvedValueOnce({
      status: 'ok',
      totalResults: 1,
      articles: [
        {
          source: { id: null, name: 'CoinTelegraph' },
          author: null,
          title: 'Bitcoin holds above $100k',
          description: 'Momentum remains positive.',
          url: 'https://example.com/bitcoin',
          urlToImage: 'https://example.com/bitcoin.png',
          publishedAt: '2026-03-03T12:00:00.000Z',
        },
      ],
    });

    await expect(
      fetchNewsArticles({
        q: 'bitcoin',
        language: 'en',
        pageSize: 20,
      }),
    ).resolves.toEqual([
      {
        title: 'Bitcoin holds above $100k',
        description: 'Momentum remains positive.',
        url: 'https://example.com/bitcoin',
        imageUrl: 'https://example.com/bitcoin.png',
        source: 'CoinTelegraph',
        publishedAt: '2026-03-03T12:00:00.000Z',
      },
    ]);
  });

  it('translates upstream 429 into a typed provider error', async () => {
    httpMock.mockRejectedValueOnce({ statusCode: 429 });

    await expect(
      fetchNewsArticles({
        q: 'ethereum',
        language: 'en',
        pageSize: 20,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<NewsProviderError>>({
        statusCode: 429,
        errorCode: 'NEWS_RATE_LIMIT',
        message: 'NewsAPI rate limit exceeded.',
      }),
    );
  });
});
