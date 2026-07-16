import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { COIN_FRIENDLY_NAMES, COIN_TICKER_MAP } from '../../../shared/market-coins';

@Component({
  selector: 'app-coin-explorer-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="suggestion-panel" [attr.aria-label]="isSearching() ? 'Busqueda de coins' : 'Explorar Monedas'">
      <p class="eyebrow">{{ isSearching() ? 'Busqueda' : 'Explorar Monedas' }}</p>
      <div class="chip-row">
        @for (coin of coins(); track coin) {
          <button
            type="button"
            class="chip chip-button"
            [class.chip-selected]="selected().includes(coin)"
            [class.chip-hidden]="selected().includes(coin) && !visible().includes(coin)"
            [style.--coin-color]="colorMap()[coin] ?? '#0f766e'"
            (click)="coinSelected.emit(coin)"
          >
            <span class="coin-dot"></span>
            <span class="chip-ticker">{{ ticker(coin) }}</span>
            <span class="chip-name">{{ friendlyName(coin) }}</span>
          </button>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      width: min(1100px, 100%);
      margin: 0 auto;
      box-sizing: border-box;
    }
  `,
  styleUrl: './coin-explorer-panel.component.scss',
})
export class CoinExplorerPanelComponent {
  readonly coins = input.required<string[]>();
  readonly selected = input.required<string[]>();
  readonly visible = input.required<string[]>();
  readonly colorMap = input<Record<string, string>>({});
  readonly isSearching = input(false);
  readonly coinSelected = output<string>();

  protected ticker(id: string): string {
    return COIN_TICKER_MAP[id] ?? id.slice(0, 3).toUpperCase();
  }

  protected friendlyName(id: string): string {
    return COIN_FRIENDLY_NAMES[id] ?? id;
  }
}
