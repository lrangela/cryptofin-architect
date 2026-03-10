import type {
  CryptoHistorySeries,
  CryptoQuote,
} from '../../app/shared/models/crypto.model';
import type { NewsArticle, NewsSearchParams } from '../../app/shared/models/news.model';

const FIXTURE_NOW = new Date('2026-03-10T12:00:00.000Z');

const QUOTE_FIXTURES: Record<string, Omit<CryptoQuote, 'id'>> = {
  bitcoin: {
    priceUsd: 82150.42,
    change24h: 2.34,
    lastUpdated: FIXTURE_NOW.toISOString(),
  },
  ethereum: {
    priceUsd: 4210.15,
    change24h: -1.12,
    lastUpdated: FIXTURE_NOW.toISOString(),
  },
  solana: {
    priceUsd: 188.31,
    change24h: 4.81,
    lastUpdated: FIXTURE_NOW.toISOString(),
  },
  dogecoin: {
    priceUsd: 0.21,
    change24h: 6.15,
    lastUpdated: FIXTURE_NOW.toISOString(),
  },
};

const NEWS_FIXTURES: NewsArticle[] = [
  {
    title: 'Bitcoin ETF flows remain steady as market volatility cools',
    description: 'Institutional demand holds up while traders rotate toward large-cap crypto assets.',
    url: 'https://example.com/news/bitcoin-etf-flows',
    source: 'Crypto Daily',
    publishedAt: '2026-03-09T15:30:00.000Z',
  },
  {
    title: 'Ethereum developers outline next upgrade milestone',
    description: 'Core contributors shared the rollout plan for the next network improvement bundle.',
    url: 'https://example.com/news/ethereum-upgrade',
    source: 'Chain Journal',
    publishedAt: '2026-03-08T18:00:00.000Z',
  },
  {
    title: 'Solana ecosystem sees renewed activity in consumer apps',
    description: 'New wallet integrations and lower fees continue to attract retail users.',
    url: 'https://example.com/news/solana-consumer-apps',
    source: 'BlockWire',
    publishedAt: '2026-03-07T10:15:00.000Z',
  },
  {
    title: 'Crypto markets digest macro data ahead of Fed remarks',
    description: 'Bitcoin and Ethereum traded in a tight range as investors waited for policy signals.',
    url: 'https://example.com/news/macro-fed-crypto',
    source: 'Market Pulse',
    publishedAt: '2026-03-06T12:45:00.000Z',
  },
];

export function isE2EMockApiEnabled(): boolean {
  return process.env['E2E_MOCK_API'] === 'true';
}

export function getMockQuotes(ids: string[]): CryptoQuote[] {
  return ids.map((id) => ({
    id,
    ...(QUOTE_FIXTURES[id] ?? {
      priceUsd: 100,
      change24h: 0,
      lastUpdated: FIXTURE_NOW.toISOString(),
    }),
  }));
}

export function getMockHistory(id: string, days: number): CryptoHistorySeries {
  const basePrice = (QUOTE_FIXTURES[id]?.priceUsd ?? 100) * 0.92;
  const pointCount = days <= 1 ? 8 : Math.min(days + 1, 8);
  const stepMs = days <= 1 ? 3 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  return {
    id,
    points: Array.from({ length: pointCount }, (_, index) => ({
      timestamp: new Date(FIXTURE_NOW.getTime() - (pointCount - index - 1) * stepMs).toISOString(),
      priceUsd: Number((basePrice + index * (basePrice * 0.015)).toFixed(2)),
    })),
  };
}

export function getMockNews(params: NewsSearchParams): NewsArticle[] {
  const query = params.q.trim().toLowerCase();
  const filtered = NEWS_FIXTURES.filter((article) => {
    const haystack = `${article.title} ${article.description}`.toLowerCase();
    return haystack.includes(query);
  });

  const articles = filtered.length > 0 ? filtered : NEWS_FIXTURES;
  return articles.slice(0, params.pageSize);
}
