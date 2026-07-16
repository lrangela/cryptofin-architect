import { describe, expect, it } from 'vitest';
import { buildApiUrl, getHttpStatusCode } from './http';

describe('http helpers', () => {
  describe('buildApiUrl', () => {
    it('joins base URL with path', () => {
      expect(buildApiUrl('https://api.example.com/', 'v1/news')).toBe(
        'https://api.example.com/v1/news',
      );
    });

    it('adds trailing slash to base if missing', () => {
      expect(buildApiUrl('https://api.example.com', 'v1/news')).toBe(
        'https://api.example.com/v1/news',
      );
    });

    it('strips leading slash from path', () => {
      expect(buildApiUrl('https://api.example.com/', '/v1/news')).toBe(
        'https://api.example.com/v1/news',
      );
    });

    it('handles both missing slash and leading slash', () => {
      expect(buildApiUrl('https://api.example.com', '/v1/news')).toBe(
        'https://api.example.com/v1/news',
      );
    });
  });

  describe('getHttpStatusCode', () => {
    it('extracts statusCode from error object', () => {
      expect(getHttpStatusCode({ statusCode: 429 })).toBe(429);
    });

    it('extracts status from error object', () => {
      expect(getHttpStatusCode({ status: 404 })).toBe(404);
    });

    it('extracts response.status from nested error', () => {
      expect(getHttpStatusCode({ response: { status: 500 } })).toBe(500);
    });

    it('returns fallback for unknown error shapes', () => {
      expect(getHttpStatusCode(new Error('unknown'))).toBe(502);
    });

    it('returns custom fallback', () => {
      expect(getHttpStatusCode(new Error('unknown'), 500)).toBe(500);
    });

    it('handles null/undefined gracefully', () => {
      expect(getHttpStatusCode(null)).toBe(502);
      expect(getHttpStatusCode(undefined)).toBe(502);
    });
  });
});
