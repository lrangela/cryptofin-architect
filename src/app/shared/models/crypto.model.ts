export interface CryptoQuote {
  id: string;
  priceUsd: number;
  change24h: number;
  lastUpdated: string;
}

export interface CryptoHistoryPoint {
  timestamp: string;
  priceUsd: number;
}

export interface CryptoHistorySeries {
  id: string;
  points: CryptoHistoryPoint[];
}

export interface CryptoErrorResponse {
  errorCode:
    | 'CRYPTO_ID_REQUIRED'
    | 'CRYPTO_IDS_REQUIRED'
    | 'CRYPTO_INVALID_DAYS'
    | 'CRYPTO_PROVIDER_ERROR';
  message: string;
}
