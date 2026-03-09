export const MARKET_COIN_CATALOG = [
  'bitcoin',
  'ethereum',
  'solana',
  'ripple',
  'dogecoin',
  'cardano',
  'tron',
  'avalanche-2',
  'chainlink',
  'polkadot',
  'litecoin',
  'sui',
] as const;

export function normalizeCoinId(value: string): string {
  return value.trim().toLowerCase();
}

export function parseMarketCoinsParam(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map((coin) => normalizeCoinId(coin))
        .filter(Boolean),
    ),
  );
}

export function symbolLabel(id: string): string {
  if (id === 'bitcoin') {
    return 'BTC';
  }

  if (id === 'ethereum') {
    return 'ETH';
  }

  if (id === 'ripple') {
    return 'XRP';
  }

  if (id === 'dogecoin') {
    return 'DOGE';
  }

  return id.slice(0, 3).toUpperCase();
}
