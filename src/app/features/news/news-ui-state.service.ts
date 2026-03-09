import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NewsUiStateService {
  readonly query = signal('');
  readonly language = signal('en');
  readonly from = signal('');
  readonly to = signal('');
  readonly pageSize = signal(20);
  readonly page = signal(1);

  readonly queryParams = computed(() => ({
    q: this.query().trim() || null,
    language: this.language().trim() || 'en',
    from: this.from().trim() || null,
    to: this.to().trim() || null,
    pageSize: this.pageSize(),
    page: this.page(),
  }));

  hydrateFromRoute(params: {
    q?: string | null;
    language?: string | null;
    from?: string | null;
    to?: string | null;
    pageSize?: string | null;
    page?: string | null;
  }): void {
    this.query.set(params.q?.trim() ?? '');
    this.language.set(params.language?.trim() || 'en');
    this.from.set(params.from?.trim() ?? '');
    this.to.set(params.to?.trim() ?? '');

    const nextPageSize = Number(params.pageSize);
    this.pageSize.set(
      nextPageSize === 10 || nextPageSize === 50 ? nextPageSize : 20,
    );

    const nextPage = Number(params.page);
    this.page.set(Number.isFinite(nextPage) && nextPage > 0 ? nextPage : 1);
  }
}
