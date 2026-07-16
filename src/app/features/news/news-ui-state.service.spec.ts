import { describe, expect, it } from 'vitest';
import { NewsUiStateService } from './news-ui-state.service';

describe('NewsUiStateService', () => {
  it('initializes with default values', () => {
    const service = new NewsUiStateService();
    expect(service.query()).toBe('');
    expect(service.language()).toBe('en');
    expect(service.from()).toBe('');
    expect(service.to()).toBe('');
    expect(service.pageSize()).toBe(20);
    expect(service.page()).toBe(1);
  });

  describe('hydrateFromRoute', () => {
    it('syncs signals from route params', () => {
      const service = new NewsUiStateService();
      service.hydrateFromRoute({
        q: 'bitcoin',
        language: 'es',
        from: '2026-01-01',
        to: '2026-03-01',
        pageSize: '50',
        page: '2',
      });

      expect(service.query()).toBe('bitcoin');
      expect(service.language()).toBe('es');
      expect(service.from()).toBe('2026-01-01');
      expect(service.to()).toBe('2026-03-01');
      expect(service.pageSize()).toBe(50);
      expect(service.page()).toBe(2);
    });

    it('validates pageSize to 10 or 50, defaults to 20', () => {
      const service = new NewsUiStateService();

      service.hydrateFromRoute({ pageSize: '10' });
      expect(service.pageSize()).toBe(10);

      service.hydrateFromRoute({ pageSize: '50' });
      expect(service.pageSize()).toBe(50);

      service.hydrateFromRoute({ pageSize: '25' });
      expect(service.pageSize()).toBe(20);

      service.hydrateFromRoute({ pageSize: 'invalid' });
      expect(service.pageSize()).toBe(20);
    });

    it('validates page must be > 0', () => {
      const service = new NewsUiStateService();

      service.hydrateFromRoute({ page: '3' });
      expect(service.page()).toBe(3);

      service.hydrateFromRoute({ page: '0' });
      expect(service.page()).toBe(1);

      service.hydrateFromRoute({ page: '-5' });
      expect(service.page()).toBe(1);
    });

    it('handles null/undefined params gracefully', () => {
      const service = new NewsUiStateService();
      service.hydrateFromRoute({});
      expect(service.query()).toBe('');
      expect(service.language()).toBe('en');
    });
  });

  describe('queryParams', () => {
    it('returns trimmed query params object', () => {
      const service = new NewsUiStateService();
      service.hydrateFromRoute({ q: '  bitcoin  ', language: 'es' });

      const params = service.queryParams();
      expect(params).toHaveProperty('q', 'bitcoin');
      expect(params).toHaveProperty('language', 'es');
    });

    it('nullifies empty values', () => {
      const service = new NewsUiStateService();
      const params = service.queryParams();
      expect(params['from']).toBeNull();
      expect(params['to']).toBeNull();
    });
  });
});
