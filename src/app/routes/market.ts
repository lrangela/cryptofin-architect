import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, DeferredBlockListener } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { RouteMeta } from '@analogjs/router';
import type { MarketComparisonChartComponent } from '../features/market/components/market-comparison-chart.component';
import { MarketApiService } from '../features/market/market-api.service';
import {
  MARKET_COIN_CATALOG,
  normalizeCoinId,
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
    CurrencyPipe,
    DecimalPipe,
    DatePipe,
  ],
  host: {
    class: 'page-shell',
  },
  template: `
    <section class="page-panel">
      <header class="page-header">
        <div>
          <p class="eyebrow">Local API</p>
          <h1>Market</h1>
          <p class="page-copy">
            Compara varias coins sobre la misma grafica usando tus endpoints locales.
          </p>
        </div>

        <nav class="page-nav" aria-label="Secciones">
          <a routerLink="/news">News</a>
          <a routerLink="/market" aria-current="page">Market</a>
        </nav>
      </header>

      <section class="toolbar">
        <div class="watchlist-summary">
          <span class="eyebrow">Coins activas</span>
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
                  aria-label="Quitar coin"
                >
                  ×
                </button>
              </div>
            }
          </div>
        </div>

        <label class="field field-search">
          <span>Buscar y agregar</span>
          <input
            type="search"
            [value]="coinQuery()"
            (input)="coinQuery.set(getInputValue($event))"
            (keydown.enter)="addCoinFromQuery()"
            placeholder="bitcoin, solana, dogecoin..."
          />
        </label>

        <label class="range-control">
          <span>Rango</span>
          <select [value]="chartDays()" (change)="chartDays.set(getDaysValue($event))">
            @for (days of availableRanges; track days) {
              <option [value]="days">{{ daysLabel(days) }}</option>
            }
          </select>
        </label>

        @if (state().refreshing) {
          <p class="loading-inline" aria-live="polite">Actualizando...</p>
        }
      </section>

      @if (coinOptions().length) {
        <section class="suggestion-panel" aria-label="Busqueda de coins">
          <p class="eyebrow">Busqueda</p>
          <div class="chip-row">
            @for (coin of coinOptions(); track coin) {
              <button
                type="button"
                class="chip chip-button"
                [class.chip-selected]="selectedCoins().includes(coin)"
                [class.chip-hidden]="selectedCoins().includes(coin) && !visibleCoins().includes(coin)"
                [style.--coin-color]="colorForCoin(coin)"
                (click)="selectSuggestion(coin)"
              >
                <span class="coin-dot"></span>
                <span>{{ symbolLabel(coin) }}</span>
              </button>
            }
          </div>
        </section>
      }

      @if (state().loading && !quotes().length) {
        <section class="state-card">
          <h2>Cargando mercado</h2>
          <p>Consultando precios e historico para la seleccion actual.</p>
        </section>
      } @else if (state().error; as error) {
        <section class="state-card state-error" aria-live="polite">
          <h2>Error al cargar precios</h2>
          <p>{{ error }}</p>
        </section>
      } @else if (!selectedCoins().length) {
        <section class="state-card">
          <h2>Seleccion vacia</h2>
          <p>No hubo datos para los activos solicitados.</p>
        </section>
      } @else {
        @defer (on viewport) {
          <app-market-comparison-chart
            [allSeries]="allSeries()"
            [visibleIds]="visibleCoins()"
            [rangeLabel]="daysLabel(chartDays())"
            [colorMap]="coinColors()"
            [loading]="state().refreshing"
            (toggleSeries)="toggleCoinVisibility($any($event))"
          />
        } @placeholder {
          <section class="chart-shell chart-placeholder" aria-label="Cargando grafico">
            <div class="skeleton-loader">
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-chart-area"></div>
            </div>
            <p class="loading-note">Cargando gráfico...</p>
          </section>
        } @loading {
          <section class="chart-shell chart-placeholder" aria-label="Preparando gráfico">
            <p class="loading-note">Preparando visualización...</p>
          </section>
        } @error {
          <section class="state-card state-error">
            <h2>Error al cargar el gráfico</h2>
            <p>No se pudo cargar la visualización. Intenta recargar la página.</p>
          </section>
        }

        <section class="market-grid" aria-label="Tarjetas del mercado">
          @for (quote of orderedQuotes(); track quote.id) {
            <article class="market-card" [class.card-dimmed]="!visibleCoins().includes(quote.id)">
              <div class="market-card-header">
                <div>
                  <p class="eyebrow">{{ symbolLabel(quote.id) }}</p>
                  <h2>{{ quote.id }}</h2>
                </div>
                <p [class.positive]="quote.change24h >= 0" [class.negative]="quote.change24h < 0">
                  {{ quote.change24h >= 0 ? '+' : '' }}{{ quote.change24h | number:'1.2-2' }}%
                </p>
              </div>

              <p class="market-price">{{ quote.priceUsd | currency:'USD':'symbol':'1.2-2' }}</p>
              <p class="market-time">
                Actualizado: {{ quote.lastUpdated | date:'mediumTime' }}
              </p>
            </article>
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
  protected readonly availableRanges = [1, 7, 30] as const;
  private readonly colorPalette = ['#0f766e', '#2563eb', '#dc2626', '#7c3aed', '#ea580c', '#0891b2'];
  private readonly coinCatalog = [...MARKET_COIN_CATALOG];
  private readonly routeCoins = toSignal(
    this.route.queryParamMap,
    { initialValue: this.route.snapshot.queryParamMap },
  );

  readonly selectedCoins = signal(['bitcoin', 'ethereum']);
  readonly visibleCoins = signal(['bitcoin', 'ethereum']);
  readonly coinQuery = signal('');
  readonly chartDays = signal<1 | 7 | 30>(7);

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

  readonly orderedQuotes = computed(() =>
    this.selectedCoins()
      .map((id) => this.quotes().find((quote) => quote.id === id))
      .filter((quote): quote is CryptoQuote => !!quote),
  );

  readonly coinOptions = computed(() => {
    const query = normalizeCoinId(this.coinQuery());
    const matches = this.coinCatalog.filter((coin) => !query || coin.includes(query));
    const matchList = matches as readonly string[];
    const selectedFirst = [
      ...this.selectedCoins().filter((coin) => matchList.includes(coin)),
      ...matches.filter((coin) => !this.selectedCoins().includes(coin)),
    ];
    return selectedFirst.slice(0, 10);
  });

  constructor() {
    effect(() => {
      const routeParam = this.routeCoins().get('coins');
      const routeCoins = parseMarketCoinsParam(routeParam).filter((coin) =>
        (this.coinCatalog as readonly string[]).includes(coin),
      );

      if (!routeCoins.length) {
        return;
      }

      const currentKey = this.selectedCoins().join(',');
      const nextKey = routeCoins.join(',');
      if (currentKey === nextKey) {
        return;
      }

      this.selectedCoins.set(routeCoins);
      this.visibleCoins.set(routeCoins);
    });

    effect(() => {
      const coins = this.selectedCoins().join(',');
      const current = this.route.snapshot.queryParamMap.get('coins') ?? '';
      if (coins === current) {
        return;
      }

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { coins },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  protected getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected addCoinFromQuery(): void {
    const coin = normalizeCoinId(this.coinQuery());
    if (!coin) {
      return;
    }

    this.addCoin(coin);
  }

  protected selectSuggestion(coin: string): void {
    if (!this.selectedCoins().includes(coin)) {
      this.addCoin(coin);
      return;
    }

    this.toggleCoinVisibility(coin);
  }

  protected addCoin(coin: string): void {
    const normalizedCoin = normalizeCoinId(coin);
    if (!normalizedCoin) {
      return;
    }

    this.selectedCoins.update((coins) =>
      coins.includes(normalizedCoin) ? coins : [...coins, normalizedCoin],
    );
    this.visibleCoins.update((coins) =>
      coins.includes(normalizedCoin) ? coins : [...coins, normalizedCoin],
    );
    this.coinQuery.set('');
  }

  protected removeCoin(coin: string): void {
    if (this.selectedCoins().length <= 1) {
      return;
    }

    this.selectedCoins.update((coins) => coins.filter((item) => item !== coin));
    this.visibleCoins.update((coins) => coins.filter((item) => item !== coin));
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
    if (days === 1) {
      return '24 horas';
    }

    return `${days} dias`;
  }

  protected symbolLabel(id: string): string {
    return symbolLabel(id);
  }

  protected colorForCoin(id: string): string {
    return this.coinColors()[id] ?? '#0f766e';
  }
}
