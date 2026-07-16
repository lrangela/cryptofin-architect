import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { RouteMeta } from '@analogjs/router';
import { MarketComparisonChartComponent } from '../features/market/components/market-comparison-chart.component';
import { MarketCoinCardComponent } from '../features/market/components/market-coin-card.component';
import { CoinExplorerPanelComponent } from '../features/market/components/coin-explorer-panel.component';
import { MarketApiService } from '../features/market/market-api.service';
import { WatchlistService } from '../shared/watchlist.service';
import {
  MARKET_COIN_CATALOG,
  COIN_TICKER_MAP,
  normalizeCoinId,
  resolveCoinId,
  parseMarketCoinsParam,
  symbolLabel,
} from '../shared/market-coins';
import type {
  CryptoHistorySeries,
  CryptoQuote,
} from '../shared/models/crypto.model';

export const routeMeta: RouteMeta = {
  title: 'Market',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MarketComparisonChartComponent,
    MarketCoinCardComponent,
    CoinExplorerPanelComponent,
  ],
  host: {
    class: 'page-shell',
  },
  template: `
    <section class="page-panel">
      <header class="page-header">
        <div>
          <p class="eyebrow">{{ t().eyebrow }}</p>
          <h1>Market</h1>
          <p class="page-copy">{{ t().pageCopy }}</p>
        </div>

        <nav class="page-nav" [attr.aria-label]="t().navLabel">
          <a routerLink="/news">News</a>
          <a routerLink="/market" aria-current="page">Market</a>
        </nav>
      </header>

      <section class="toolbar">
        <div class="watchlist-summary">
          <span class="eyebrow">{{ t().activeCoins }}</span>
          <div class="active-coin-row">
            @for (item of selectedCoins(); track item) {
              <div
                class="active-coin"
                [class.is-hidden]="!visibleCoins().includes(item)"
                [style.--coin-color]="colorForCoin(item)"
              >
                <button type="button" class="active-coin-toggle" (click)="toggleCoinVisibility(item)">
                  <span class="coin-dot"></span>
                  <span>{{ symbolLabel(item) }}</span>
                </button>
                <button
                  type="button"
                  class="active-coin-remove"
                  [disabled]="selectedCoins().length <= 1"
                  (click)="removeCoin(item)"
                  [attr.aria-label]="t().removeCoin"
                >
                  ×
                </button>
              </div>
            }
          </div>
        </div>

        <label class="field field-search">
          <span>{{ t().searchLabel }}</span>
          <input
            type="search"
            [value]="coinQuery()"
            (input)="coinQuery.set(getInputValue($event))"
            (keydown.enter)="addCoinFromQuery()"
            [placeholder]="t().searchPlaceholder"
          />
        </label>

        <label class="range-control">
          <span>{{ t().rangeLabel }}</span>
          <select [value]="chartDays()" (change)="chartDays.set(getDaysValue($event))">
            @for (days of availableRanges; track days) {
              <option [value]="days">{{ daysLabel(days) }}</option>
            }
          </select>
        </label>

        @if (state().refreshing) {
          <p class="loading-inline" aria-live="polite">{{ t().refreshing }}</p>
        }
      </section>

      @if (coinOptions().length) {
        <app-coin-explorer-panel
          [coins]="coinOptions()"
          [selected]="selectedCoins()"
          [visible]="visibleCoins()"
          [colorMap]="coinColors()"
          [isSearching]="!!coinQuery()"
          (coinSelected)="selectSuggestion($event)"
        />
      }

      @if (state().loading && !quotes().length) {
        <section class="state-card">
          <h2>{{ t().loadingTitle }}</h2>
          <p>{{ t().loadingCopy }}</p>
        </section>
      } @else if (state().error; as error) {
        <section class="state-card state-error" aria-live="polite">
          <h2>{{ t().errorTitle }}</h2>
          <p>{{ error }}</p>
        </section>
      } @else if (!selectedCoins().length) {
        <section class="state-card">
          <h2>{{ t().emptyTitle }}</h2>
          <p>{{ t().emptyCopy }}</p>
        </section>
      } @else {
        @defer (on timer(0ms)) {
          <app-market-comparison-chart
            [allSeries]="allSeries()"
            [visibleIds]="visibleCoins()"
            [rangeLabel]="daysLabel(chartDays())"
            [colorMap]="coinColors()"
            [loading]="state().refreshing"
            (toggleSeries)="toggleCoinVisibility($any($event))"
          />
        } @placeholder {
          <section class="chart-shell chart-placeholder" [attr.aria-label]="t().chartLoading">
            <div class="skeleton-loader">
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-chart-area"></div>
            </div>
            <p class="loading-note">{{ t().chartLoading }}</p>
          </section>
        } @loading {
          <section class="chart-shell chart-placeholder" [attr.aria-label]="t().chartPreparing">
            <p class="loading-note">{{ t().chartPreparing }}</p>
          </section>
        } @error {
          <section class="state-card state-error">
            <h2>{{ t().chartError }}</h2>
            <p>{{ t().chartErrorCopy }}</p>
          </section>
        }

        <section class="market-grid" [attr.aria-label]="t().gridLabel">
          @for (coinId of selectedCoins(); track coinId) {
            <app-market-coin-card
              [coinId]="coinId"
              [quote]="quoteForCoin(coinId)"
              [color]="colorForCoin(coinId)"
              [dimmed]="!visibleCoins().includes(coinId)"
            />
          }
        </section>
      }
    </section>
  `,
  styleUrl: './market.scss',
})
export default class MarketPage {
  private readonly marketApi = inject(MarketApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly watchlist = inject(WatchlistService);
  protected readonly availableRanges = [1, 7, 30] as const;
  private readonly colorPalette = ['#0f766e', '#2563eb', '#dc2626', '#7c3aed', '#ea580c', '#0891b2'];
  private readonly coinCatalog = [...MARKET_COIN_CATALOG];
  private readonly routeCoins = toSignal(
    this.route.queryParamMap,
    { initialValue: this.route.snapshot.queryParamMap },
  );

  readonly coinQuery = signal('');
  readonly chartDays = signal<1 | 7 | 30>(7);

  readonly selectedCoins = computed(() => {
    const routeParam = this.routeCoins().get('coins');
    const routeCoins = parseMarketCoinsParam(routeParam).filter((coin) =>
      (this.coinCatalog as readonly string[]).includes(coin),
    );
    return routeCoins.length ? routeCoins : this.watchlist.selectedCoins();
  });

  readonly visibleCoins = signal(['bitcoin', 'ethereum']);

  readonly t = computed(() => {
    const lang = this.watchlist.language();
    return lang === 'es' ? MARKET_I18N.es : MARKET_I18N.en;
  });

  private readonly request = computed(() => ({
    ids: this.selectedCoins(),
    days: this.chartDays(),
  }));

  readonly marketResource = rxResource<
    CryptoQuote[],
    { ids: string[]; days: 1 | 7 | 30 }
  >({
    params: () => this.request(),
    stream: ({ params }) => this.marketApi.getQuotes(params.ids),
  });

  readonly historyResource = rxResource<
    CryptoHistorySeries[],
    { ids: string[]; days: 1 | 7 | 30 }
  >({
    params: () => this.request(),
    stream: ({ params }) => this.marketApi.getWatchlistHistory(params.ids, params.days),
  });

  readonly quotes = computed(() =>
    this.marketResource.hasValue() ? this.marketResource.value() : [],
  );

  readonly historyById = computed(() => {
    const entries = this.historyResource.hasValue() ? this.historyResource.value() : [];
    return new Map(entries.map((series) => [series.id, series]));
  });

  readonly allSeries = computed(() =>
    this.selectedCoins()
      .map((coin) => this.historyById().get(coin))
      .filter((series): series is CryptoHistorySeries => !!series),
  );

  readonly coinColors = computed(() =>
    Object.fromEntries(
      this.selectedCoins().map((coin, index) => [coin, this.colorPalette[index % this.colorPalette.length]]),
    ),
  );

  readonly state = computed(() => ({
    loading: this.marketResource.isLoading() || this.historyResource.isLoading(),
    refreshing:
      (this.marketResource.isLoading() || this.historyResource.isLoading()) &&
      (this.marketResource.hasValue() || this.historyResource.hasValue()),
    error:
      this.marketResource.error()?.message ??
      this.historyResource.error()?.message ??
      null,
  }));

  readonly coinOptions = computed(() => {
    const query = normalizeCoinId(this.coinQuery());
    const matches = this.coinCatalog.filter((coin) => {
      if (!query) {
        return true;
      }
      const ticker = (COIN_TICKER_MAP[coin] ?? '').toLowerCase();
      return coin.includes(query) || ticker.includes(query);
    });
    const matchList = matches as readonly string[];
    const selectedFirst = [
      ...this.selectedCoins().filter((coin) => matchList.includes(coin)),
      ...matches.filter((coin) => !this.selectedCoins().includes(coin)),
    ];
    return selectedFirst.slice(0, 10);
  });

  constructor() {
    // Sync visible coins with selected coins
    effect(() => {
      const coins = this.selectedCoins();
      this.visibleCoins.update(current => {
        const next = current.filter(c => coins.includes(c));
        const missing = coins.filter(c => !current.includes(c));
        return [...next, ...missing];
      });
    });

    // Persist selected coins to WatchlistService when route has coins param
    effect(() => {
      const coins = this.selectedCoins();
      const routeParam = this.routeCoins().get('coins');
      if (routeParam) {
        this.watchlist.setCoins(coins);
      }
    });

    // If no coins param in URL, redirect to include persisted coins
    if (!this.route.snapshot.queryParamMap.has('coins')) {
      const persisted = this.watchlist.selectedCoins();
      this.updateRoute(persisted);
    }
  }

  protected getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected addCoinFromQuery(): void {
    const resolved = resolveCoinId(this.coinQuery());
    if (!resolved) {
      return;
    }

    this.addCoin(resolved);
  }

  protected selectSuggestion(coin: string): void {
    if (!this.selectedCoins().includes(coin)) {
      this.addCoin(coin);
      return;
    }

    this.toggleCoinVisibility(coin);
  }

  private updateRoute(coins: string[]): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { coins: coins.join(',') },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected addCoin(coin: string): void {
    const resolved = resolveCoinId(coin);
    if (!resolved) {
      return;
    }

    const current = this.selectedCoins();
    if (!current.includes(resolved)) {
      this.updateRoute([...current, resolved]);
    }
    this.coinQuery.set('');
  }

  protected removeCoin(coin: string): void {
    const current = this.selectedCoins();
    if (current.length <= 1) {
      return;
    }

    this.updateRoute(current.filter((item) => item !== coin));
  }

  protected toggleCoinVisibility(coin: string): void {
    if (!this.selectedCoins().includes(coin)) {
      return;
    }

    if (this.visibleCoins().includes(coin)) {
      if (this.visibleCoins().length <= 1) {
        return;
      }

      this.visibleCoins.update((coins) => coins.filter((item) => item !== coin));
      return;
    }

    this.visibleCoins.update((coins) => [...coins, coin]);
  }

  protected getDaysValue(event: Event): 1 | 7 | 30 {
    const value = Number((event.target as HTMLSelectElement).value);
    if (value === 1 || value === 30) {
      return value;
    }

    return 7;
  }

  protected daysLabel(days: number): string {
    const lang = this.watchlist.language();
    if (days === 1) {
      return lang === 'es' ? '24 horas' : '24 hours';
    }
    return lang === 'es' ? `${days} dias` : `${days} days`;
  }

  protected symbolLabel(id: string): string {
    return symbolLabel(id);
  }

  protected colorForCoin(id: string): string {
    return this.coinColors()[id] ?? '#0f766e';
  }

  protected quoteForCoin(id: string): CryptoQuote | undefined {
    return this.quotes().find((q) => q.id === id);
  }
}

const MARKET_I18N = {
  en: {
    eyebrow: 'Local API',
    pageCopy: 'Compare multiple coins on the same chart using your local endpoints.',
    navLabel: 'Sections',
    activeCoins: 'Active coins',
    removeCoin: 'Remove coin',
    searchLabel: 'Search and add',
    searchPlaceholder: 'bitcoin, solana, dogecoin...',
    rangeLabel: 'Range',
    refreshing: 'Refreshing...',
    loadingTitle: 'Loading market',
    loadingCopy: 'Fetching prices and history for the current selection.',
    errorTitle: 'Error loading prices',
    emptyTitle: 'Empty selection',
    emptyCopy: 'No data for the requested assets.',
    chartLoading: 'Loading chart...',
    chartPreparing: 'Preparing visualization...',
    chartError: 'Error loading chart',
    chartErrorCopy: 'Could not load the visualization. Try reloading the page.',
    gridLabel: 'Market cards',
  },
  es: {
    eyebrow: 'API Local',
    pageCopy: 'Compara varias coins sobre la misma grafica usando tus endpoints locales.',
    navLabel: 'Secciones',
    activeCoins: 'Coins activas',
    removeCoin: 'Quitar coin',
    searchLabel: 'Buscar y agregar',
    searchPlaceholder: 'bitcoin, solana, dogecoin...',
    rangeLabel: 'Rango',
    refreshing: 'Actualizando...',
    loadingTitle: 'Cargando mercado',
    loadingCopy: 'Consultando precios e historico para la seleccion actual.',
    errorTitle: 'Error al cargar precios',
    emptyTitle: 'Seleccion vacia',
    emptyCopy: 'No hubo datos para los activos solicitados.',
    chartLoading: 'Cargando grafico...',
    chartPreparing: 'Preparando visualizacion...',
    chartError: 'Error al cargar el grafico',
    chartErrorCopy: 'No se pudo cargar la visualizacion. Intenta recargar la pagina.',
    gridLabel: 'Tarjetas del mercado',
  },
} as const;
