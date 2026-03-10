import { getQuery, type H3Event } from 'h3';
// @ts-ignore
import { defineCachedEventHandler } from '#imports';
import type {
  CryptoErrorResponse,
  CryptoHistorySeries,
} from '../../../../../app/shared/models/crypto.model';
import {
  CryptoProviderError,
  getCoinGeckoHistory,
} from '../../../../services/crypto/coingecko.provider';
import {
  getMockHistory,
  isE2EMockApiEnabled,
} from '../../../../services/e2e-api-fixtures';
import { jsonError } from '../response';
import {
  logApiError,
  logProviderStart,
  createTimingMiddleware,
} from '../../../../services/logger';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;

const timing = createTimingMiddleware();

function parseId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const id = value.trim().toLowerCase();
  return id.length > 0 ? id : null;
}

function parseDays(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return DEFAULT_DAYS;
  }

  const days = Number.parseInt(value, 10);
  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }

  return Math.min(days, MAX_DAYS);
}

export async function cryptoHistoryHandler(
  event: H3Event,
): Promise<CryptoHistorySeries | CryptoErrorResponse> {
  const startTime = timing.start();
  const query = getQuery(event);
  const id = parseId(query['id']);
  const days = parseDays(query['days']);

  if (!id) {
    return jsonError(
      event,
      400,
      'CRYPTO_ID_REQUIRED',
      'Query parameter "id" is required.',
    );
  }

  if (days === null) {
    return jsonError(
      event,
      400,
      'CRYPTO_INVALID_DAYS',
      'Query parameter "days" must be a positive number.',
    );
  }

  // Log de inicio de petición al proveedor
  logProviderStart('CoinGecko', '/coins/{id}/market_chart', { id, days });

  try {
    if (isE2EMockApiEnabled()) {
      const result = getMockHistory(id, days);
      timing.end(startTime, 'CoinGecko', '/coins/{id}/market_chart', true, undefined, result.points?.length ?? 0);
      return result;
    }

    const result = await getCoinGeckoHistory(id, days);
    
    // Log de éxito
    timing.end(startTime, 'CoinGecko', '/coins/{id}/market_chart', true, undefined, result.points?.length ?? 0);
    
    return result;
  } catch (error: unknown) {
    // Log de error con timing
    timing.end(startTime, 'CoinGecko', '/coins/{id}/market_chart', false, error);
    
    if (error instanceof CryptoProviderError) {
      logApiError('/api/v1/crypto/history', error, error.statusCode);
      return jsonError(event, error.statusCode, error.errorCode, error.message);
    }

    logApiError('/api/v1/crypto/history', error, 502);

    return jsonError(
      event,
      502,
      'CRYPTO_PROVIDER_ERROR',
      'Crypto history provider request failed.',
    );
  }
}

export default defineCachedEventHandler(cryptoHistoryHandler, {
  maxAge: 300,
  name: 'crypto-history-cache',
  getKey: (event: H3Event) => {
    const query = getQuery(event);
    const id = parseId(query['id']) ?? '';
    const days = parseDays(query['days']) ?? DEFAULT_DAYS;
    return `${id}:${days}`;
  },
});
