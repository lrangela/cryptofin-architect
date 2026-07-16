import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { CryptoQuote } from '../../../shared/models/crypto.model';
import { symbolLabel, COIN_FRIENDLY_NAMES } from '../../../shared/market-coins';

@Component({
  selector: 'app-market-coin-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, DatePipe],
  template: `
    @if (quote()) {
      <article 
        class="market-card" 
        [class.card-dimmed]="dimmed()"
        [style.--coin-accent]="color()"
      >
        <div class="card-accent-bar"></div>
        <div class="market-card-header">
          <div class="card-identity">
            <span class="ticker-badge">{{ label() }}</span>
            <h2 class="coin-display-name">{{ displayName() }}</h2>
          </div>
          <span 
            class="price-badge" 
            [class.positive]="quote()!.change24h >= 0" 
            [class.negative]="quote()!.change24h < 0"
          >
            <span class="direction-arrow">{{ quote()!.change24h >= 0 ? '▲' : '▼' }}</span>
            {{ quote()!.change24h >= 0 ? '+' : '' }}{{ quote()!.change24h | number:'1.2-2' }}%
          </span>
        </div>
        <div class="price-content">
          <span class="currency-symbol">$</span>
          <span class="market-price">{{ quote()!.priceUsd | number:'1.2-2' }}</span>
        </div>
        <div class="card-footer">
          <span class="updated-label">Actualizado</span>
          <span class="market-time">{{ quote()!.lastUpdated | date:'mediumTime' }}</span>
        </div>
      </article>
    } @else {
      <article class="market-card skeleton-market-card">
        <div class="card-accent-bar skeleton-pulse"></div>
        <div class="market-card-header">
          <div class="card-identity">
            <span class="ticker-badge skeleton-pulse" style="width: 45px; height: 18px; border-radius: 99px; display: inline-block;"></span>
            <h2 class="coin-display-name skeleton-pulse" style="width: 80px; height: 22px; border-radius: 4px; margin-top: 4px;"></h2>
          </div>
        </div>
        <div class="price-content skeleton-pulse" style="width: 140px; height: 38px; border-radius: 6px; margin: 10px 0;"></div>
        <div class="card-footer">
          <span class="updated-label skeleton-pulse" style="width: 60px; height: 14px; border-radius: 4px; display: inline-block;"></span>
          <span class="market-time skeleton-pulse" style="width: 70px; height: 14px; border-radius: 4px; display: inline-block;"></span>
        </div>
      </article>
    }
  `,
  styles: `:host { display: contents; }`,
  styleUrl: './market-coin-card.component.scss',
})
export class MarketCoinCardComponent {
  readonly coinId = input.required<string>();
  readonly quote = input<CryptoQuote | undefined>();
  readonly color = input('#0f766e');
  readonly dimmed = input(false);

  readonly label = computed(() => symbolLabel(this.coinId()));
  readonly displayName = computed(() => {
    const id = this.coinId();
    return COIN_FRIENDLY_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
  });
}
