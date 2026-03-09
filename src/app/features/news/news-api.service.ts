import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import type {
  NewsArticle,
  NewsErrorResponse,
  NewsSearchParams,
} from '../../shared/models/news.model';
import { extractApiErrorMessage } from '../../shared/http-error';

@Injectable({ providedIn: 'root' })
export class NewsApiService {
  private readonly http = inject(HttpClient);

  searchNews(params: NewsSearchParams): Observable<NewsArticle[]> {
    let httpParams = new HttpParams()
      .set('q', params.q)
      .set('language', params.language)
      .set('pageSize', String(params.pageSize));

    if (params.from) {
      httpParams = httpParams.set('from', params.from);
    }

    if (params.to) {
      httpParams = httpParams.set('to', params.to);
    }

    return this.http
      .get<NewsArticle[] | NewsErrorResponse>('/api/v1/news', {
        params: httpParams,
      })
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }

          throw new Error(response.message);
        }),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'No se pudo cargar las noticias.'))),
        ),
      );
  }
}
