import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { RouteMeta } from '@analogjs/router';
import { NewsApiService } from '../features/news/news-api.service';
import { NewsUiStateService } from '../features/news/news-ui-state.service';
import {
  MARKET_COIN_CATALOG,
  normalizeCoinId,
  symbolLabel,
} from '../shared/market-coins';
import type { NewsSearchParams } from '../shared/models/news.model';

export const routeMeta: RouteMeta = {
  title: 'News',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  host: {
    class: 'page-shell',
  },
  template: `
    <section class="page-panel">
      <header class="page-header">
        <div>
          <p class="eyebrow">Local API</p>
          <h1>News</h1>
          <p class="page-copy">
            Busca noticias usando tu endpoint local <code>/api/v1/news</code>.
          </p>
        </div>

        <nav class="page-nav" aria-label="Secciones">
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
          <span>Buscar</span>
          <input
            type="search"
            [value]="query()"
            (input)="query.set(getInputValue($event))"
            placeholder="bitcoin, ethereum, markets..."
          />
        </label>

        <label class="field">
          <span>Idioma</span>
          <select [value]="language()" (change)="language.set(getSelectValue($event) || 'en')">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
          </select>
        </label>

        <label class="field">
          <span>Desde</span>
          <input type="date" [value]="from()" (input)="from.set(getInputValue($event))" />
        </label>

        <label class="field">
          <span>Hasta</span>
          <input type="date" [value]="to()" (input)="to.set(getInputValue($event))" />
        </label>

        <label class="field">
          <span>Tamaño</span>
          <select [value]="pageSize()" (change)="pageSize.set(getSelectNumber($event))">
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
            Ver {{ symbolLabel(marketCoin) }} en Market
          </a>
        }
      </form>

      @if (filteredSuggestions().length) {
        <section class="suggestion-panel" aria-label="Sugerencias de búsqueda">
          <p class="eyebrow">Temas relacionados</p>
          <div class="chip-row">
            @for (suggestion of filteredSuggestions(); track suggestion) {
              <button type="button" class="chip chip-button" (click)="setQuery(suggestion)">
                {{ suggestion }}
              </button>
            }
          </div>
        </section>
      }

      @if (!query().trim()) {
        <section class="state-card">
          <h2>Empieza una búsqueda</h2>
          <p>Escribe un término para consultar noticias desde el backend.</p>
        </section>
      } @else if (state().loading) {
        <section class="state-card">
          <h2>Cargando noticias</h2>
          <p>Consultando el endpoint local con debounce de 350 ms.</p>
        </section>
      } @else if (state().error; as error) {
        <section class="state-card state-error" aria-live="polite">
          <h2>Error al cargar noticias</h2>
          <p>{{ error }}</p>
        </section>
      } @else if (!articles().length && state().hasRequested) {
        <section class="state-card">
          <h2>Sin resultados</h2>
          <p>No se encontraron noticias para "{{ debouncedQuery() }}".</p>
        </section>
      } @else {
        @defer (on viewport; prefetch on idle) {
          <section class="news-grid" aria-label="Resultados de noticias">
            @for (article of paginatedArticles(); track article.url) {
              <article class="news-card">
                <p class="card-meta">
                  <span>{{ article.source }}</span>
                  <span>{{ article.publishedAt | date:'mediumDate' }}</span>
                </p>
                <h2>{{ article.title }}</h2>
                <p>{{ article.description || 'Sin descripción disponible.' }}</p>
                <a [href]="article.url" target="_blank" rel="noreferrer">Abrir noticia</a>
              </article>
            }
          </section>

          @if (totalPages() > 1) {
            <nav class="pagination" aria-label="Paginación de noticias">
              <button
                type="button"
                class="page-btn"
                [disabled]="page() <= 1"
                (click)="goToPage(page() - 1)"
                aria-label="Página anterior"
              >&#8592; Anterior</button>

              <span class="page-info">
                Página <strong>{{ page() }}</strong> de <strong>{{ totalPages() }}</strong>
                &nbsp;·&nbsp; {{ articles().length }} resultados
              </span>

              <button
                type="button"
                class="page-btn"
                [disabled]="page() >= totalPages()"
                (click)="goToPage(page() + 1)"
                aria-label="Página siguiente"
              >Siguiente &#8594;</button>
            </nav>
          }
        } @placeholder {
          <section class="news-grid" aria-label="Cargando noticias">
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
          <p class="loading-inline" aria-live="polite">Cargando más noticias...</p>
        } @error {
          <section class="state-card state-error">
            <h2>Error al cargar noticias</h2>
            <p>No se pudo cargar la lista de noticias. Intenta recargar la página.</p>
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

  readonly query = this.newsState.query;
  readonly language = this.newsState.language;
  readonly from = this.newsState.from;
  readonly to = this.newsState.to;
  readonly pageSize = this.newsState.pageSize;
  readonly page = this.newsState.page;
  readonly debouncedQuery = signal('');
  readonly itemsPerPage = 10;
  private readonly lastDebouncedQuery = signal<string | null>(null);

  private readonly params = computed<NewsSearchParams | null>(() => {
    const q = this.debouncedQuery().trim();

    if (!q) {
      return null;
    }

    return {
      q,
      language: this.language().trim() || 'en',
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
    const q = normalizeCoinId(this.query());
    if (!q) {
      return this.topicCatalog.slice(0, 6);
    }

    const exactMatch = this.topicCatalog.find((t) => t.toLowerCase() === q);
    if (exactMatch) {
      return [];
    }

    return this.topicCatalog
      .filter((topic) => topic.toLowerCase().includes(q))
      .slice(0, 6);
  });

  readonly marketCoinLink = computed(() => {
    const q = normalizeCoinId(this.query());
    return MARKET_COIN_CATALOG.includes(q as (typeof MARKET_COIN_CATALOG)[number]) ? q : null;
  });

  constructor() {
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
    });

    effect((onCleanup) => {
      const nextValue = this.query();
      const timeoutId = setTimeout(() => {
        this.debouncedQuery.set(nextValue);
      }, 350);
      onCleanup(() => clearTimeout(timeoutId));
    });

    effect(() => {
      const nextQuery = this.debouncedQuery();
      const previousQuery = this.lastDebouncedQuery();

      if (previousQuery !== null && previousQuery !== nextQuery) {
        this.page.set(1);
      }

      this.lastDebouncedQuery.set(nextQuery);
    });

    effect(() => {
      const nextParams = this.newsState.queryParams();
      const current = this.route.snapshot.queryParamMap;
      
      // Comparación estricta para evitar navegación redundante
      const hasChanged = 
        (nextParams.q ?? '') !== (current.get('q') ?? '') ||
        nextParams.language !== (current.get('language') ?? 'en') ||
        (nextParams.from ?? '') !== (current.get('from') ?? '') ||
        (nextParams.to ?? '') !== (current.get('to') ?? '') ||
        nextParams.pageSize !== Number(current.get('pageSize') ?? 20) ||
        nextParams.page !== Number(current.get('page') ?? 1);

      if (!hasChanged) {
        return;
      }

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: nextParams,
        replaceUrl: true,
      });
    });
  }

  protected goToPage(n: number): void {
    const clamped = Math.max(1, Math.min(n, this.totalPages()));
    this.page.set(clamped);

    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  protected setQuery(suggestion: string): void {
    this.query.set(suggestion);
  }

  protected symbolLabel(id: string): string {
    return symbolLabel(id);
  }
}
