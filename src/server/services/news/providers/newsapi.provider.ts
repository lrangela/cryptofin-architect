import type {
  NewsArticle,
  NewsSearchParams,
} from '../../../../app/shared/models/news.model';
import { buildApiUrl, getHttpStatusCode, getServerEnv, http } from '../../http';

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
    throw new NewsProviderError(
      502,
      'NEWS_PROVIDER_ERROR',
      'NEWSAPI_KEY is not configured on the server.',
    );
  }

  const url = buildApiUrl(apiBaseUrl, 'everything');

  try {
    const data = await http<NewsApiResponse>(url, {
      query: {
        q: params.q,
        language: params.language,
        from: params.from,
        to: params.to,
        pageSize: params.pageSize,
        apiKey,
      },
    });

    return data.articles.map(normalizeNewsArticle);
  } catch (error: unknown) {
    const statusCode = getHttpStatusCode(error);

    if (statusCode === 401) {
      throw new NewsProviderError(
        401,
        'NEWS_UNAUTHORIZED',
        'NewsAPI rejected the configured API key.',
      );
    }

    if (statusCode === 429) {
      throw new NewsProviderError(
        429,
        'NEWS_RATE_LIMIT',
        'NewsAPI rate limit exceeded.',
      );
    }

    throw new NewsProviderError(
      502,
      'NEWS_PROVIDER_ERROR',
      'News provider request failed.',
    );
  }
}
