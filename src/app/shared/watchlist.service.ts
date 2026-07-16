import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEYS = {
  coins: 'watchlist_coins',
  language: 'app_language',
} as const;

const DEFAULT_COINS = ['bitcoin', 'ethereum'];
const DEFAULT_LANGUAGE = 'en';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly selectedCoins = signal<string[]>(this.loadCoins());
  readonly language = signal<string>(this.loadLanguage());

  constructor() {
    effect(() => {
      if (this.isBrowser) {
        localStorage.setItem(STORAGE_KEYS.coins, JSON.stringify(this.selectedCoins()));
      }
    });

    effect(() => {
      if (this.isBrowser) {
        localStorage.setItem(STORAGE_KEYS.language, this.language());
      }
    });
  }

  private loadCoins(): string[] {
    if (!this.isBrowser) return DEFAULT_COINS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.coins);
      if (!raw) return DEFAULT_COINS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_COINS;
    } catch {
      return DEFAULT_COINS;
    }
  }

  private loadLanguage(): string {
    if (!this.isBrowser) return DEFAULT_LANGUAGE;
    return localStorage.getItem(STORAGE_KEYS.language) || DEFAULT_LANGUAGE;
  }

  setCoins(coins: string[]): void {
    this.selectedCoins.set(coins.length > 0 ? coins : DEFAULT_COINS);
  }

  setLanguage(lang: string): void {
    this.language.set(lang || DEFAULT_LANGUAGE);
  }
}
