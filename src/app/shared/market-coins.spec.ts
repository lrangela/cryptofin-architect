import { describe, expect, it } from 'vitest';
import {
  MARKET_COIN_CATALOG,
  COIN_TICKER_MAP,
  COIN_FRIENDLY_NAMES,
  normalizeCoinId,
  resolveCoinId,
  parseMarketCoinsParam,
  symbolLabel,
} from './market-coins';

describe('market-coins', () => {
  describe('normalizeCoinId', () => {
    it('trims and lowercases input', () => {
      expect(normalizeCoinId('  Bitcoin  ')).toBe('bitcoin');
      expect(normalizeCoinId('ETHEREUM')).toBe('ethereum');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(normalizeCoinId('   ')).toBe('');
    });
  });

  describe('COIN_TICKER_MAP', () => {
    it('maps all catalog coins to tickers', () => {
      for (const coin of MARKET_COIN_CATALOG) {
        expect(COIN_TICKER_MAP[coin]).toBeDefined();
        expect(COIN_TICKER_MAP[coin]).toMatch(/^[A-Z]{2,5}$/);
      }
    });

    it('has correct known mappings', () => {
      expect(COIN_TICKER_MAP['bitcoin']).toBe('BTC');
      expect(COIN_TICKER_MAP['ethereum']).toBe('ETH');
      expect(COIN_TICKER_MAP['avalanche-2']).toBe('AVAX');
      expect(COIN_TICKER_MAP['cardano']).toBe('ADA');
    });
  });

  describe('COIN_FRIENDLY_NAMES', () => {
    it('maps all catalog coins to friendly names', () => {
      for (const coin of MARKET_COIN_CATALOG) {
        expect(COIN_FRIENDLY_NAMES[coin]).toBeDefined();
        expect(COIN_FRIENDLY_NAMES[coin].length).toBeGreaterThan(0);
      }
    });

    it('has correct known mappings', () => {
      expect(COIN_FRIENDLY_NAMES['bitcoin']).toBe('Bitcoin');
      expect(COIN_FRIENDLY_NAMES['avalanche-2']).toBe('Avalanche');
      expect(COIN_FRIENDLY_NAMES['cardano']).toBe('Cardano');
    });
  });

  describe('resolveCoinId', () => {
    it('resolves tickers to coin IDs', () => {
      expect(resolveCoinId('BTC')).toBe('bitcoin');
      expect(resolveCoinId('btc')).toBe('bitcoin');
      expect(resolveCoinId('AVAX')).toBe('avalanche-2');
      expect(resolveCoinId('avax')).toBe('avalanche-2');
      expect(resolveCoinId('ADA')).toBe('cardano');
    });

    it('resolves friendly names to coin IDs', () => {
      expect(resolveCoinId('bitcoin')).toBe('bitcoin');
      expect(resolveCoinId('Bitcoin')).toBe('bitcoin');
      expect(resolveCoinId('avalanche')).toBe('avalanche-2');
      expect(resolveCoinId('Avalanche')).toBe('avalanche-2');
    });

    it('resolves CoinGecko IDs directly', () => {
      expect(resolveCoinId('bitcoin')).toBe('bitcoin');
      expect(resolveCoinId('avalanche-2')).toBe('avalanche-2');
    });

    it('returns null for unknown inputs', () => {
      expect(resolveCoinId('unknown-coin')).toBeNull();
      expect(resolveCoinId('')).toBeNull();
      expect(resolveCoinId('   ')).toBeNull();
    });

    it('handles case-insensitive input', () => {
      expect(resolveCoinId('Bitcoin')).toBe('bitcoin');
      expect(resolveCoinId('BITCOIN')).toBe('bitcoin');
      expect(resolveCoinId('Eth')).toBe('ethereum');
    });
  });

  describe('parseMarketCoinsParam', () => {
    it('parses comma-separated coin IDs', () => {
      expect(parseMarketCoinsParam('bitcoin,ethereum')).toEqual(['bitcoin', 'ethereum']);
    });

    it('resolves tickers in query params', () => {
      expect(parseMarketCoinsParam('BTC,ETH,SOL')).toEqual(['bitcoin', 'ethereum', 'solana']);
    });

    it('deduplicates resolved IDs', () => {
      expect(parseMarketCoinsParam('BTC,bitcoin')).toEqual(['bitcoin']);
    });

    it('filters out unknown coins', () => {
      expect(parseMarketCoinsParam('bitcoin,unknown,ethereum')).toEqual(['bitcoin', 'ethereum']);
    });

    it('returns empty array for null/undefined', () => {
      expect(parseMarketCoinsParam(null)).toEqual([]);
      expect(parseMarketCoinsParam(undefined)).toEqual([]);
    });

    it('handles mixed tickers and IDs', () => {
      expect(parseMarketCoinsParam('AVAX,bitcoin,LINK')).toEqual(['avalanche-2', 'bitcoin', 'chainlink']);
    });
  });

  describe('symbolLabel', () => {
    it('returns ticker for known coins', () => {
      expect(symbolLabel('bitcoin')).toBe('BTC');
      expect(symbolLabel('ethereum')).toBe('ETH');
    });

    it('returns first 3 chars uppercased for unknown', () => {
      expect(symbolLabel('unknown')).toBe('UNK');
    });
  });
});
