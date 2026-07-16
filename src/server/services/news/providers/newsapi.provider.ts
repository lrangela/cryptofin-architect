import type {
  NewsArticle,
  NewsSearchParams,
} from '../../../../app/shared/models/news.model';
import { buildApiUrl, getHttpStatusCode, getServerEnv, http } from '../../http';
import { logApiError, logProviderError, logProviderStart, logProviderSuccess } from '../../logger';

interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
}

interface NewsApiResponse {
  status: 'ok' | 'error';
  totalResults: number;
  articles: NewsApiArticle[];
}

const MOJIBAKE_PATTERN = /(?:Ã.|Â.|â.|ð.)/;

export class NewsProviderError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode:
      | 'NEWS_UNAUTHORIZED'
      | 'NEWS_RATE_LIMIT'
      | 'NEWS_PROVIDER_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'NewsProviderError';
  }
}

export function normalizeNewsArticle(article: NewsApiArticle): NewsArticle {
  const title = normalizeNewsText(article.title);
  const description = normalizeNewsText(article.description ?? '');
  const source = normalizeNewsText(article.source.name);

  return {
    title,
    description,
    url: article.url,
    imageUrl: article.urlToImage ?? undefined,
    source,
    publishedAt: article.publishedAt,
  };
}

function normalizeNewsText(value: string): string {
  if (!MOJIBAKE_PATTERN.test(value)) {
    return value;
  }

  const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
  const decoded = new TextDecoder('utf-8').decode(bytes);

  return decoded.includes('\uFFFD') ? value : decoded;
}

export async function fetchNewsArticles(
  params: NewsSearchParams,
): Promise<NewsArticle[]> {
  const env = getServerEnv();
  const apiKey = env['NEWSAPI_KEY'];
  const apiBaseUrl = env['NEWSAPI_BASE_URL'] ?? 'https://newsapi.org/v2/';

  if (!apiKey) {
    // Log real error server-side, return generic message to client
    logApiError('/api/v1/news', new Error('NEWSAPI_KEY is not configured'), 503);
    throw new NewsProviderError(
      503,
      'NEWS_PROVIDER_ERROR',
      'Servicio temporalmente no disponible.',
    );
  }

  const url = buildApiUrl(apiBaseUrl, 'everything');
  const timing = Date.now();

  logProviderStart('NewsAPI', '/everything', { q: params.q, language: params.language });

  try {
    // Send API key securely via header instead of query parameter (OWASP)
    const data = await http<NewsApiResponse>(url, {
      headers: {
        'X-Api-Key': apiKey,
      },
      query: {
        q: params.q,
        language: params.language,
        from: params.from,
        to: params.to,
        pageSize: params.pageSize,
      },
    });

    logProviderSuccess('NewsAPI', '/everything', Date.now() - timing, data.articles.length);
    return data.articles.map(normalizeNewsArticle);
  } catch (error: unknown) {
    const statusCode = getHttpStatusCode(error);
    logProviderError('NewsAPI', '/everything', error, Date.now() - timing);

    if (statusCode === 401) {
      // Mask the internal detail — don't expose key validation issues to client
      logApiError('/api/v1/news', error, 401);
      throw new NewsProviderError(
        401,
        'NEWS_UNAUTHORIZED',
        'Servicio de noticias no disponible temporalmente.',
      );
    }

    if (statusCode === 429) {
      throw new NewsProviderError(
        429,
        'NEWS_RATE_LIMIT',
        'Límite de peticiones alcanzado. Intenta de nuevo más tarde.',
      );
    }

    throw new NewsProviderError(
      502,
      'NEWS_PROVIDER_ERROR',
      'Servicio de noticias no disponible.',
    );
  }
}
