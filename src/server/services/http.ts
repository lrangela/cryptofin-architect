import { $fetch } from 'ofetch';
import { logApiError } from './logger';

export function getServerEnv() {
  const env = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env ?? {};

  return {
    ...env,
  } as Record<string, string | undefined>;
}

export function buildApiUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(normalizedPath, normalizedBase).toString();
}

export function getHttpStatusCode(error: unknown, fallback = 502): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    return error.response.status;
  }

  return fallback;
}

export const http = $fetch.create({
  retry: 2,
  timeout: 8000,
  headers: {
    accept: 'application/json',
  },
  onResponseError({ response }) {
    // Use structured logger instead of raw console.error
    logApiError(`HTTP ${response.url}`, new Error(response.statusText), response.status);
  },
});
