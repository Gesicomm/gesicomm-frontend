import { describe, expect, test } from 'vitest';
import { resolveApiOriginFor } from './apiBase';

describe('resolveApiOriginFor', () => {
  test('keeps a localhost API URL when the app runs locally', () => {
    expect(resolveApiOriginFor({
      configuredURL: 'http://localhost:3000',
      hostname: 'localhost',
    })).toBe('http://localhost:3000');
  });

  test('ignores a localhost build-time API URL on the production hostname', () => {
    expect(resolveApiOriginFor({
      configuredURL: 'http://localhost:3000',
      hostname: 'gesicomm.com',
    })).toBe('https://api.gesicomm.com');
  });

  test('uses the test API on the test frontend hostname', () => {
    expect(resolveApiOriginFor({
      configuredURL: 'http://localhost:3000',
      hostname: 'test.gesicomm.com',
    })).toBe('https://api.test.gesicomm.com');
  });

  test('normalizes configured API URLs that already include /api', () => {
    expect(resolveApiOriginFor({
      configuredURL: 'https://api.gesicomm.com/api',
      hostname: 'gesicomm.com',
    })).toBe('https://api.gesicomm.com');
  });
});
