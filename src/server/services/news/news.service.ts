import type {
  NewsArticle,
  NewsSearchParams,
} from '../../../app/shared/models/news.model';
import { fetchNewsArticles } from './providers/newsapi.provider';

export async function getNews(params: NewsSearchParams): Promise<NewsArticle[]> {
  return fetchNewsArticles(params);
}
