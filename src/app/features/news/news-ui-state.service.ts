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
    const nextQuery = params.q?.trim() ?? '';
    if (this.query() !== nextQuery) {
      this.query.set(nextQuery);
    }

    const nextLanguage = params.language?.trim() || 'en';
    if (this.language() !== nextLanguage) {
      this.language.set(nextLanguage);
    }

    const nextFrom = params.from?.trim() ?? '';
    if (this.from() !== nextFrom) {
      this.from.set(nextFrom);
    }

    const nextTo = params.to?.trim() ?? '';
    if (this.to() !== nextTo) {
      this.to.set(nextTo);
    }

    const nextPageSize = Number(params.pageSize);
    const validPageSize = nextPageSize === 10 || nextPageSize === 50 ? nextPageSize : 20;
    if (this.pageSize() !== validPageSize) {
      this.pageSize.set(validPageSize);
    }

    const nextPage = Number(params.page);
    const validPage = Number.isFinite(nextPage) && nextPage > 0 ? nextPage : 1;
    if (this.page() !== validPage) {
      this.page.set(validPage);
    }
  }
}
