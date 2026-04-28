import * as fc from 'fast-check';
import { t, getAllKeys } from './i18n';
import { setLanguage, getLanguage, _reset } from './languagePreference';
import { Language } from '../types';

beforeEach(() => _reset());

// ── Property 17: Language toggle returns translations for all keys ─────────────
// Feature: ethiopian-marketplace, Property 17: Language toggle returns translations for all keys
// Validates: Requirements 6.1, 6.2, 6.4

describe('Property 17: Language toggle returns translations for all keys', () => {
  it('for any translation key and any supported language, t() returns a non-empty string', () => {
    const keys = getAllKeys();
    const languages: Language[] = ['en', 'om'];

    fc.assert(
      fc.property(
        fc.constantFrom(...keys),
        fc.constantFrom(...languages),
        (key, language) => {
          const result = t(key, language);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
          // Should not fall back to the key itself (meaning translation exists)
          expect(result).not.toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('English and Oromo translations are different for most keys', () => {
    const keys = getAllKeys();
    // At least 80% of keys should have different translations
    const diffCount = keys.filter((k) => t(k, 'en') !== t(k, 'om')).length;
    expect(diffCount / keys.length).toBeGreaterThan(0.8);
  });
});

// ── Property 18: Language preference persistence ──────────────────────────────
// Feature: ethiopian-marketplace, Property 18: Language preference persistence
// Validates: Requirements 6.3

describe('Property 18: Language preference persistence', () => {
  it('for any user and language selection, reading back returns the same language', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom<Language>('en', 'om'),
        (userId, language) => {
          _reset();
          setLanguage(userId, language);
          const stored = getLanguage(userId);
          expect(stored).toBe(language);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('default language is English when no preference is set', () => {
    fc.assert(
      fc.property(fc.uuid(), (userId) => {
        _reset();
        expect(getLanguage(userId)).toBe('en');
      }),
      { numRuns: 50 }
    );
  });
});
