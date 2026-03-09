import { getQuery, type H3Event } from 'h3';
// @ts-ignore
import { defineCachedEventHandler } from '#imports';
import type {
  NewsArticle,
  NewsErrorResponse,
  NewsSearchParams,
} from '../../../../app/shared/models/news.model';
import { getNews } from '../../../services/news/news.service';
import { NewsProviderError } from '../../../services/news/providers/newsapi.provider';
import { jsonError } from './response';
import {
  logApiError,
  logProviderStart,
  createTimingMiddleware,
  logCache,
} from '../../../services/logger';

const DEFAULT_LANGUAGE = 'en';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const timing = createTimingMiddleware();

function toTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function parsePageSize(value: unknown): number {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return DEFAULT_PAGE_SIZE;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(parsed, MAX_PAGE_SIZE);
}

function isValidDate(value: string | undefined): boolean {
  return value === undefined || ISO_DATE_PATTERN.test(value);
}

export async function newsHandler(
  event: H3Event,
): Promise<NewsArticle[] | NewsErrorResponse> {
  const startTime = timing.start();
  const query = getQuery(event);
  const q = toTrimmedString(query['q']);

  if (!q) {
    return jsonError(
      event,
      400,
      'NEWS_QUERY_REQUIRED',
      'Query parameter "q" is required.',
    );
  }

  const language = toTrimmedString(query['language']) ?? DEFAULT_LANGUAGE;
  const from = toTrimmedString(query['from']);
  const to = toTrimmedString(query['to']);

  if (!isValidDate(from) || !isValidDate(to)) {
    return jsonError(
      event,
      400,
      'NEWS_PROVIDER_ERROR',
      'Parameters "from" and "to" must use YYYY-MM-DD format.',
    );
  }

  const params: NewsSearchParams = {
    q,
    language,
    from,
    to,
    pageSize: parsePageSize(query['pageSize']),
  };

  // Log de inicio de petición al proveedor
  logProviderStart('NewsAPI', '/top-headlines', { q, language });

  try {
    const result = await getNews(params);
    
    // Log de éxito
    timing.end(startTime, 'NewsAPI', '/top-headlines', true, undefined, Array.isArray(result) ? result.length : 0);
    
    return result;
  } catch (error: any) {
    // Log de error con timing
    timing.end(startTime, 'NewsAPI', '/top-headlines', false, error);
    
    // Usar verificación estructural en lugar de instanceof para mayor seguridad en entornos de bundle
    if (error && typeof error === 'object' && error.name === 'NewsProviderError') {
      logApiError('/api/v1/news', error, error.statusCode);
      return jsonError(event, error.statusCode, error.errorCode, error.message);
    }

    logApiError('/api/v1/news', error, 502);

    return jsonError(
      event,
      502,
      'NEWS_PROVIDER_ERROR',
      error instanceof Error ? error.message : 'News provider request failed.',
    );
  }
}

export default defineCachedEventHandler(newsHandler, {
  maxAge: 60,
  name: 'news-cache',
  getKey: (event: H3Event) => {
    const query = getQuery(event);
    const q = toTrimmedString(query['q']) || 'top-headlines';
    const language = toTrimmedString(query['language']) ?? DEFAULT_LANGUAGE;
    const from = toTrimmedString(query['from']) || '';
    const to = toTrimmedString(query['to']) || '';
    const pageSize = parsePageSize(query['pageSize']);
    return `${q}-${language}-${from}-${to}-${pageSize}`;
  },
});
