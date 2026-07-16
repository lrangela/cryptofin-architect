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

export const COIN_TICKER_MAP: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  ripple: 'XRP',
  dogecoin: 'DOGE',
  cardano: 'ADA',
  tron: 'TRX',
  'avalanche-2': 'AVAX',
  chainlink: 'LINK',
  polkadot: 'DOT',
  litecoin: 'LTC',
  sui: 'SUI',
};

export const COIN_FRIENDLY_NAMES: Record<string, string> = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  solana: 'Solana',
  ripple: 'XRP',
  dogecoin: 'Dogecoin',
  cardano: 'Cardano',
  tron: 'TRON',
  'avalanche-2': 'Avalanche',
  chainlink: 'Chainlink',
  polkadot: 'Polkadot',
  litecoin: 'Litecoin',
  sui: 'Sui',
};

const SEARCH_MAP: Record<string, string> = {
  // Tickers
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  xrp: 'ripple',
  doge: 'dogecoin',
  ada: 'cardano',
  trx: 'tron',
  avax: 'avalanche-2',
  link: 'chainlink',
  dot: 'polkadot',
  ltc: 'litecoin',
  sui: 'sui',

  // Friendly names
  bitcoin: 'bitcoin',
  ethereum: 'ethereum',
  solana: 'solana',
  ripple: 'ripple',
  dogecoin: 'dogecoin',
  cardano: 'cardano',
  tron: 'tron',
  avalanche: 'avalanche-2',
  'avalanche-2': 'avalanche-2',
  chainlink: 'chainlink',
  polkadot: 'polkadot',
  litecoin: 'litecoin',
};

export function resolveCoinId(value: string): string | null {
  const norm = normalizeCoinId(value);
  if (!norm) {
    return null;
  }
  return SEARCH_MAP[norm] ?? (MARKET_COIN_CATALOG.includes(norm as any) ? norm : null);
}

export function parseMarketCoinsParam(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map((coin) => resolveCoinId(coin) || normalizeCoinId(coin))
        .filter((coin): coin is string => !!coin && MARKET_COIN_CATALOG.includes(coin as any)),
    ),
  );
}

export function symbolLabel(id: string): string {
  const normalizedId = normalizeCoinId(id);
  return COIN_TICKER_MAP[normalizedId] ?? normalizedId.slice(0, 3).toUpperCase();
}
