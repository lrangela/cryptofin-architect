import { getQuery, type H3Event } from 'h3';
// @ts-ignore
import { defineCachedEventHandler } from '#imports';
import type {
  CryptoErrorResponse,
  CryptoQuote,
} from '../../../../app/shared/models/crypto.model';
import {
  CryptoProviderError,
  getCoinGeckoQuotes,
} from '../../../services/crypto/coingecko.provider';
import {
  getMockQuotes,
  isE2EMockApiEnabled,
} from '../../../services/e2e-api-fixtures';
import { jsonError } from './response';
import {
  logApiError,
  logProviderStart,
  createTimingMiddleware,
} from '../../../services/logger';

const timing = createTimingMiddleware();

function parseIds(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map((id) => id.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export async function cryptoHandler(
  event: H3Event,
): Promise<CryptoQuote[] | CryptoErrorResponse> {
  const startTime = timing.start();
  const query = getQuery(event);
  const ids = parseIds(query['ids']);

  if (ids.length === 0) {
    return jsonError(
      event,
      400,
      'CRYPTO_IDS_REQUIRED',
      'Query parameter "ids" is required.',
    );
  }

  // Log de inicio de petición al proveedor
  logProviderStart('CoinGecko', '/simple/price', { ids: ids.join(',') });

  try {
    if (isE2EMockApiEnabled()) {
      const result = getMockQuotes(ids);
      timing.end(startTime, 'CoinGecko', '/simple/price', true, undefined, result.length);
      return result;
    }

    const result = await getCoinGeckoQuotes(ids);
    
    // Log de éxito
    timing.end(startTime, 'CoinGecko', '/simple/price', true, undefined, result.length);
    
    return result;
  } catch (error: unknown) {
    // Log de error con timing
    timing.end(startTime, 'CoinGecko', '/simple/price', false, error);
    
    if (error instanceof CryptoProviderError) {
      logApiError('/api/v1/crypto', error, error.statusCode);
      return jsonError(event, error.statusCode, error.errorCode, error.message);
    }

    logApiError('/api/v1/crypto', error, 502);

    return jsonError(
      event,
      502,
      'CRYPTO_PROVIDER_ERROR',
      'Crypto provider request failed.',
    );
  }
}

export default process.env['DISABLE_CACHE'] === 'true'
  ? cryptoHandler
  : defineCachedEventHandler(cryptoHandler, {
      maxAge: 30,
      name: 'crypto-cache',
      getKey: (event: H3Event) => parseIds(getQuery(event)['ids']).join(','),
    });
