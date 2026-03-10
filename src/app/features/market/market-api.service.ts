import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, throwError } from 'rxjs';
import {
  getGitHubPagesHistory,
  getGitHubPagesQuotes,
  isGitHubPagesBuild,
} from '../../shared/github-pages-data';
import type {
  CryptoErrorResponse,
  CryptoHistorySeries,
  CryptoQuote,
} from '../../shared/models/crypto.model';
import { extractApiErrorMessage } from '../../shared/http-error';

@Injectable({ providedIn: 'root' })
export class MarketApiService {
  private readonly http = inject(HttpClient);

  getQuotes(ids: string[]): Observable<CryptoQuote[]> {
    if (isGitHubPagesBuild) {
      return of(getGitHubPagesQuotes(ids));
    }

    const params = new HttpParams().set('ids', ids.join(','));

    return this.http
      .get<CryptoQuote[] | CryptoErrorResponse>('/api/v1/crypto', { params })
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }

          throw new Error(response.message);
        }),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'No se pudo cargar el mercado.'))),
        ),
      );
  }

  getHistory(id: string, days: number): Observable<CryptoHistorySeries> {
    if (isGitHubPagesBuild) {
      return of(getGitHubPagesHistory(id, days));
    }

    const params = new HttpParams().set('id', id).set('days', String(days));

    return this.http
      .get<CryptoHistorySeries | CryptoErrorResponse>('/api/v1/crypto/history', {
        params,
      })
      .pipe(
        map((response) => {
          if ('points' in response) {
            return response;
          }

          throw new Error(response.message);
        }),
        catchError((error: unknown) =>
          throwError(() => new Error(extractApiErrorMessage(error, 'No se pudo cargar el mercado.'))),
        ),
      );
  }

  getWatchlistHistory(ids: string[], days: number): Observable<CryptoHistorySeries[]> {
    return forkJoin(ids.map((id) => this.getHistory(id, days)));
  }
}
