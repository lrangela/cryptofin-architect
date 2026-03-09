import type {
  CryptoHistoryPoint,
  CryptoHistorySeries,
  CryptoQuote,
} from '../../../app/shared/models/crypto.model';
import { buildApiUrl, getHttpStatusCode, getServerEnv, http } from '../http';

interface CoinGeckoQuote {
  usd?: number;
  usd_24h_change?: number | null;
  last_updated_at?: number;
}

type CoinGeckoSimplePriceResponse = Record<string, CoinGeckoQuote>;

interface CoinGeckoMarketChartResponse {
  prices?: [number, number][];
}

export class CryptoProviderError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: 'CRYPTO_PROVIDER_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'CryptoProviderError';
  }
}

export function normalizeCoinGeckoQuote(
  id: string,
  quote?: CoinGeckoQuote,
): CryptoQuote | null {
  if (!quote || typeof quote.usd !== 'number') {
    return null;
  }

  return {
    id,
    priceUsd: quote.usd,
    change24h: typeof quote.usd_24h_change === 'number' ? quote.usd_24h_change : 0,
    lastUpdated: quote.last_updated_at
      ? new Date(quote.last_updated_at * 1000).toISOString()
      : new Date().toISOString(),
  };
}

export async function getCoinGeckoQuotes(ids: string[]): Promise<CryptoQuote[]> {
  const env = getServerEnv();
  const apiBaseUrl = env['COINGECKO_BASE'] ?? 'https://api.coingecko.com/api/v3';
  const path = env['COINGECKO_SIMPLE_PRICE_PATH'] ?? '/simple/price';
  const vsCurrency = env['COINGECKO_VS_CURRENCY'] ?? 'usd';
  const url = buildApiUrl(apiBaseUrl, path);

  try {
    const data = await http<CoinGeckoSimplePriceResponse>(url, {
      query: {
        ids: ids.join(','),
        vs_currencies: vsCurrency,
        include_24hr_change: 'true',
        include_last_updated_at: 'true',
      },
    });

    return ids
      .map((id) => normalizeCoinGeckoQuote(id, data[id]))
      .filter((quote): quote is CryptoQuote => quote !== null);
  } catch (error: unknown) {
    throw new CryptoProviderError(
      getHttpStatusCode(error),
      'CRYPTO_PROVIDER_ERROR',
      'Crypto provider request failed.',
    );
  }
}

export function normalizeCoinGeckoHistoryPoints(
  points: [number, number][] | undefined,
): CryptoHistoryPoint[] {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length === 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]),
    )
    .map(([timestamp, priceUsd]) => ({
      timestamp: new Date(timestamp).toISOString(),
      priceUsd,
    }));
}

export async function getCoinGeckoHistory(
  id: string,
  days: number,
): Promise<CryptoHistorySeries> {
  const env = getServerEnv();
  const apiBaseUrl = env['COINGECKO_BASE'] ?? 'https://api.coingecko.com/api/v3';
  const vsCurrency = env['COINGECKO_VS_CURRENCY'] ?? 'usd';
  const path =
    env['COINGECKO_MARKET_CHART_PATH'] ?? `/coins/${id}/market_chart`;
  const url = buildApiUrl(
    apiBaseUrl,
    path.includes('{id}') ? path.replace('{id}', id) : path,
  );

  try {
    const data = await http<CoinGeckoMarketChartResponse>(url, {
      query: {
        vs_currency: vsCurrency,
        days: String(days),
        interval: days <= 1 ? 'hourly' : 'daily',
      },
    });

    return {
      id,
      points: normalizeCoinGeckoHistoryPoints(data.prices),
    };
  } catch (error: unknown) {
    throw new CryptoProviderError(
      getHttpStatusCode(error),
      'CRYPTO_PROVIDER_ERROR',
      'Crypto history request failed.',
    );
  }
}
