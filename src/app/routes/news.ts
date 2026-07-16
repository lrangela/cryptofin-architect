import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { RouteMeta } from '@analogjs/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { NewsApiService } from '../features/news/news-api.service';
import { NewsUiStateService } from '../features/news/news-ui-state.service';
import { NewsArticleCardComponent } from '../features/news/components/news-article-card.component';
import { WatchlistService } from '../shared/watchlist.service';
import {
  MARKET_COIN_CATALOG,
  normalizeCoinId,
  symbolLabel,
} from '../shared/market-coins';
import type { NewsSearchParams } from '../shared/models/news.model';

const MAX_TOPIC_SELECTIONS = 3;

export const routeMeta: RouteMeta = {
  title: 'News',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NewsArticleCardComponent],
  host: {
    class: 'page-shell',
  },
  template: `
    <section class="page-panel">
      <header class="page-header">
        <div>
          <p class="eyebrow">{{ t().eyebrow }}</p>
          <h1>News</h1>
          <p class="page-copy">{{ t().pageCopy }}</p>
        </div>

        <nav class="page-nav" [attr.aria-label]="t().navLabel">
          <a
            routerLink="/news"
            [queryParams]="newsState.queryParams()"
            aria-current="page"
          >News</a>
          <a routerLink="/market">Market</a>
        </nav>
      </header>

      <form class="toolbar" (submit)="$event.preventDefault()">
        <label class="field field-search">
          <span>{{ t().searchLabel }}</span>
          <input
            type="search"
            [value]="query()"
            (input)="query.set(getInputValue($event))"
            [placeholder]="t().searchPlaceholder"
          />
        </label>

        <label class="field">
          <span>{{ t().languageLabel }}</span>
          <select [value]="language()" (change)="onLanguageChange($event)">
            <option value="en">English</option>
            <option value="es">Espanol</option>
          </select>
        </label>

        <label class="field">
          <span>{{ t().fromLabel }}</span>
          <input type="date" [value]="from()" (input)="onFromChange($event)" />
        </label>

        <label class="field">
          <span>{{ t().toLabel }}</span>
          <input type="date" [value]="to()" (input)="onToChange($event)" />
        </label>

        <label class="field">
          <span>{{ t().pageSizeLabel }}</span>
          <select [value]="pageSize()" (change)="onPageSizeChange($event)">
            <option [value]="10">10</option>
            <option [value]="20">20</option>
            <option [value]="50">50</option>
          </select>
        </label>

        @if (marketCoinLink(); as marketCoin) {
          <a
            class="market-link-btn"
            [routerLink]="['/market']"
            [queryParams]="{ coins: marketCoin }"
          >
            {{ t().viewInMarket(symbolLabel(marketCoin)) }}
          </a>
        }
      </form>

      @if (filteredSuggestions().length) {
        <section class="suggestion-panel" [attr.aria-label]="t().suggestionsLabel">
          <p class="eyebrow">{{ t().suggestionsTitle }}</p>
          <div class="chip-row">
            @for (suggestion of filteredSuggestions(); track suggestion) {
              <button
                type="button"
                class="chip chip-button"
                [class.chip-selected]="isTopicSelected(suggestion)"
                (click)="toggleTopic(suggestion)"
              >
                {{ suggestion }}
              </button>
            }
          </div>
        </section>
      }

      @if (!query().trim()) {
        <section class="state-card">
          <h2>{{ t().emptySearchTitle }}</h2>
          <p>{{ t().emptySearchCopy }}</p>
        </section>
      } @else if (state().loading) {
        <section class="state-card">
          <h2>{{ t().loadingTitle }}</h2>
          <p>{{ t().loadingCopy }}</p>
        </section>
      } @else if (state().error; as error) {
        <section class="state-card state-error" aria-live="polite">
          <h2>{{ t().errorTitle }}</h2>
          <p>{{ error }}</p>
        </section>
      } @else if (!articles().length && state().hasRequested) {
        <section class="state-card">
          <h2>{{ t().noResultsTitle }}</h2>
          <p>{{ t().noResultsCopy(debouncedQuery()) }}</p>
        </section>
      } @else {
        @defer (on timer(0ms); prefetch on idle) {
          <section class="news-grid" [attr.aria-label]="t().gridLabel">
            @for (article of paginatedArticles(); track article.url) {
              <app-news-article-card [article]="article" />
            }
          </section>

          @if (totalPages() > 1) {
            <nav class="pagination" [attr.aria-label]="t().paginationLabel">
              <button
                type="button"
                class="page-btn"
                [disabled]="page() <= 1"
                (click)="goToPage(page() - 1)"
                [attr.aria-label]="t().prevPage"
              >&#8592; {{ t().prevBtn }}</button>

              <span class="page-info" [innerHTML]="t().pageInfo(page(), totalPages(), articles().length)"></span>

              <button
                type="button"
                class="page-btn"
                [disabled]="page() >= totalPages()"
                (click)="goToPage(page() + 1)"
                [attr.aria-label]="t().nextPage"
              >{{ t().nextBtn }} &#8594;</button>
            </nav>
          }
        } @placeholder {
          <section class="news-grid" [attr.aria-label]="t().loadingGrid">
            @for (_ of [1, 2, 3, 4, 5]; track _; let i = $index) {
              <article class="news-card skeleton-card">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-text"></div>
                <div class="skeleton-line skeleton-text"></div>
                <div class="skeleton-line skeleton-text-short"></div>
              </article>
            }
          </section>
        } @loading {
          <p class="loading-inline" aria-live="polite">{{ t().loadingMore }}</p>
        } @error {
          <section class="state-card state-error">
            <h2>{{ t().errorTitle }}</h2>
            <p>{{ t().errorLoadCopy }}</p>
          </section>
        }
      }
    </section>
  `,
  styleUrl: './news.scss',
})
export default class NewsPage {
  private readonly newsApi = inject(NewsApiService);
  readonly newsState = inject(NewsUiStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly watchlist = inject(WatchlistService);
  private readonly routeQuery = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  private readonly topicCatalog = [
    ...MARKET_COIN_CATALOG,
    'crypto',
    'markets',
    'blockchain',
    'defi',
    'nft',
    'regulation',
    'mining',
    'altcoins',
    'web3',
  ];

  readonly query = signal('');
  readonly language = this.watchlist.language;
  readonly from = this.newsState.from;
  readonly to = this.newsState.to;
  readonly pageSize = this.newsState.pageSize;
  readonly page = this.newsState.page;

  readonly debouncedQuery = computed(() => this.routeQuery().get('q')?.trim() ?? '');
  readonly itemsPerPage = 10;

  readonly t = computed(() => {
    const lang = this.watchlist.language();
    return lang === 'es' ? NEWS_I18N.es : NEWS_I18N.en;
  });

  private readonly params = computed<NewsSearchParams | null>(() => {
    const q = this.debouncedQuery();

    if (!q) {
      return null;
    }

    return {
      q,
      language: this.watchlist.language().trim() || 'en',
      from: this.from().trim() || undefined,
      to: this.to().trim() || undefined,
      pageSize: this.pageSize(),
    };
  });

  readonly newsResource = rxResource({
    params: () => this.params() ?? undefined,
    stream: ({ params }) => this.newsApi.searchNews(params),
  });

  readonly articles = computed(() =>
    this.newsResource.hasValue() ? this.newsResource.value() : [],
  );

  readonly totalPages = computed(() =>
    Math.ceil(this.articles().length / this.itemsPerPage) || 1,
  );

  readonly paginatedArticles = computed(() => {
    const start = (this.page() - 1) * this.itemsPerPage;
    return this.articles().slice(start, start + this.itemsPerPage);
  });

  readonly state = computed(() => ({
    loading: this.newsResource.isLoading(),
    error: this.newsResource.error()?.message ?? null,
    hasRequested: this.params() !== null,
  }));

  readonly filteredSuggestions = computed(() => {
    const raw = this.query().trim();
    const activeTopics = raw
      .split(/(?:\s+or\s+|,|;)/i)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    // No query at all: show default catalog
    if (!raw) {
      return this.topicCatalog.slice(0, 8);
    }

    // Get the last term being typed (the one after the last OR/comma/semicolon)
    const lastTerm = activeTopics[activeTopics.length - 1] ?? '';
    const activeSet = new Set(activeTopics);

    // Filter: always keep active topics + match last term against catalog
    const seen = new Set<string>();
    const result: string[] = [];

    // First: always include active topics so user can deselect them
    for (const topic of activeTopics) {
      const match = this.topicCatalog.find((t) => t.toLowerCase() === topic);
      if (match && !seen.has(match)) {
        seen.add(match);
        result.push(match);
      }
    }

    // Then: add catalog items matching the last term being typed
    if (lastTerm) {
      for (const topic of this.topicCatalog) {
        if (seen.has(topic)) continue;
        if (topic.toLowerCase().includes(lastTerm)) {
          seen.add(topic);
          result.push(topic);
        }
      }
    }

    return result.slice(0, 8);
  });

  readonly marketCoinLink = computed(() => {
    const q = normalizeCoinId(this.query());
    return MARKET_COIN_CATALOG.includes(q as (typeof MARKET_COIN_CATALOG)[number]) ? q : null;
  });

  constructor() {
    // Hydrate state from route query params
    effect(() => {
      const params = this.routeQuery();
      this.newsState.hydrateFromRoute({
        q: params.get('q'),
        language: params.get('language'),
        from: params.get('from'),
        to: params.get('to'),
        pageSize: params.get('pageSize'),
        page: params.get('page'),
      });
      this.query.set(params.get('q') ?? '');

      // Sync language from route to watchlist
      const routeLang = params.get('language');
      if (routeLang && routeLang !== this.watchlist.language()) {
        this.watchlist.setLanguage(routeLang);
      }
    });

    // Debounced search-only sync: only the query input is debounced
    toObservable(this.query)
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((searchVal) => {
        this.navigateWith({ q: searchVal.trim() || null, page: 1 });
      });
  }

  /**
   * Immediate navigation helper — merges given params into current query params.
   */
  private navigateWith(partial: Record<string, string | number | null>): void {
    const current = this.route.snapshot.queryParamMap;
    const queryParams: Record<string, string | number | null> = {
      q: current.get('q') || null,
      language: current.get('language') || 'en',
      from: current.get('from') || null,
      to: current.get('to') || null,
      pageSize: Number(current.get('pageSize') || 20),
      page: Number(current.get('page') || 1),
      ...partial,
    };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  protected onLanguageChange(event: Event): void {
    const val = this.getSelectValue(event) || 'en';
    this.watchlist.setLanguage(val);
    this.navigateWith({ language: val, page: 1 });
  }

  protected onFromChange(event: Event): void {
    const val = this.getInputValue(event);
    this.from.set(val);
    this.navigateWith({ from: val.trim() || null, page: 1 });
  }

  protected onToChange(event: Event): void {
    const val = this.getInputValue(event);
    this.to.set(val);
    this.navigateWith({ to: val.trim() || null, page: 1 });
  }

  protected onPageSizeChange(event: Event): void {
    const val = this.getSelectNumber(event);
    this.pageSize.set(val);
    this.navigateWith({ pageSize: val, page: 1 });
  }

  protected goToPage(n: number): void {
    const clamped = Math.max(1, Math.min(n, this.totalPages()));
    this.page.set(clamped);
    this.navigateWith({ page: clamped });

    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Toggle a topic in the search query using OR connectors.
   * Enforces a maximum of MAX_TOPIC_SELECTIONS (3) simultaneous topics.
   */
  protected toggleTopic(topic: string): void {
    const current = this.query().trim();
    const parts = current.split(/(?:\s+or\s+|,|;)/i).map((s) => s.trim()).filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === topic.toLowerCase());

    if (idx >= 0) {
      // Remove the topic
      parts.splice(idx, 1);
    } else {
      // Enforce 3-coin limit
      if (parts.length >= MAX_TOPIC_SELECTIONS) {
        return;
      }
      parts.push(topic);
    }

    this.query.set(parts.join(' OR '));
  }

  /**
   * Checks if a topic is currently active in the search query.
   */
  protected isTopicSelected(topic: string): boolean {
    const parts = this.query().split(/(?:\s+or\s+|,|;)/i).map((s) => s.trim().toLowerCase());
    return parts.includes(topic.toLowerCase());
  }

  protected getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected getSelectNumber(event: Event): number {
    return Number((event.target as HTMLSelectElement).value) || 20;
  }

  protected getSelectValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  protected symbolLabel(id: string): string {
    return symbolLabel(id);
  }
}

const NEWS_I18N = {
  en: {
    eyebrow: 'Local API',
    pageCopy: 'Search news using your local /api/v1/news endpoint.',
    navLabel: 'Sections',
    searchLabel: 'Search',
    searchPlaceholder: 'bitcoin, ethereum OR solana...',
    languageLabel: 'Language',
    fromLabel: 'From',
    toLabel: 'To',
    pageSizeLabel: 'Page size',
    viewInMarket: (ticker: string) => `View ${ticker} in Market`,
    suggestionsLabel: 'Search suggestions',
    suggestionsTitle: 'Related topics',
    emptySearchTitle: 'Start a search',
    emptySearchCopy: 'Type a term to query news from the backend.',
    loadingTitle: 'Loading news',
    loadingCopy: 'Querying the local endpoint with 350ms debounce.',
    errorTitle: 'Error loading news',
    noResultsTitle: 'No results',
    noResultsCopy: (q: string) => `No news found for "${q}".`,
    gridLabel: 'News results',
    paginationLabel: 'News pagination',
    prevPage: 'Previous page',
    prevBtn: 'Previous',
    nextPage: 'Next page',
    nextBtn: 'Next',
    pageInfo: (page: number, total: number, count: number) =>
      `Page <strong>${page}</strong> of <strong>${total}</strong> &nbsp;&middot;&nbsp; ${count} results`,
    loadingGrid: 'Loading news',
    loadingMore: 'Loading more news...',
    errorLoadCopy: 'Could not load the news list. Try reloading the page.',
  },
  es: {
    eyebrow: 'API Local',
    pageCopy: 'Busca noticias usando tu endpoint local /api/v1/news.',
    navLabel: 'Secciones',
    searchLabel: 'Buscar',
    searchPlaceholder: 'bitcoin, ethereum OR solana...',
    languageLabel: 'Idioma',
    fromLabel: 'Desde',
    toLabel: 'Hasta',
    pageSizeLabel: 'Tamano',
    viewInMarket: (ticker: string) => `Ver ${ticker} en Market`,
    suggestionsLabel: 'Sugerencias de busqueda',
    suggestionsTitle: 'Temas relacionados',
    emptySearchTitle: 'Empieza una busqueda',
    emptySearchCopy: 'Escribe un termino para consultar noticias desde el backend.',
    loadingTitle: 'Cargando noticias',
    loadingCopy: 'Consultando el endpoint local con debounce de 350 ms.',
    errorTitle: 'Error al cargar noticias',
    noResultsTitle: 'Sin resultados',
    noResultsCopy: (q: string) => `No se encontraron noticias para "${q}".`,
    gridLabel: 'Resultados de noticias',
    paginationLabel: 'Paginacion de noticias',
    prevPage: 'Pagina anterior',
    prevBtn: 'Anterior',
    nextPage: 'Pagina siguiente',
    nextBtn: 'Siguiente',
    pageInfo: (page: number, total: number, count: number) =>
      `Pagina <strong>${page}</strong> de <strong>${total}</strong> &nbsp;&middot;&nbsp; ${count} resultados`,
    loadingGrid: 'Cargando noticias',
    loadingMore: 'Cargando mas noticias...',
    errorLoadCopy: 'No se pudo cargar la lista de noticias. Intenta recargar la pagina.',
  },
} as const;
