export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt: string;
}

export interface NewsSearchParams {
  q: string;
  language: string;
  from?: string;
  to?: string;
  pageSize: number;
}

export interface NewsErrorResponse {
  errorCode:
    | 'NEWS_QUERY_REQUIRED'
    | 'NEWS_UNAUTHORIZED'
    | 'NEWS_RATE_LIMIT'
    | 'NEWS_PROVIDER_ERROR';
  message: string;
}
