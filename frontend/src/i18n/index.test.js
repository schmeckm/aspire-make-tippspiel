import { describe, it, expect } from 'vitest';
import { normalizeLocale } from '../i18n/index.js';

describe('normalizeLocale', () => {
  it('returns default for empty input', () => {
    expect(normalizeLocale()).toBe('de');
    expect(normalizeLocale('')).toBe('de');
  });

  it('normalizes language codes', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('DE')).toBe('de');
  });

  it('falls back for unsupported locales', () => {
    expect(normalizeLocale('xx')).toBe('de');
  });
});
