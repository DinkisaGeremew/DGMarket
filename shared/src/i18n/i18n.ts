import { Language } from '../types';
import en from './en.json';
import om from './om.json';

const translations: Record<Language, Record<string, string>> = { en, om };

/**
 * Look up a translation key for the given language.
 * Returns the key itself if no translation is found.
 */
export function t(key: string, language: Language): string {
  return translations[language]?.[key] ?? key;
}

/** Returns all translation keys defined in the English file (source of truth) */
export function getAllKeys(): string[] {
  return Object.keys(en);
}

/** Returns true if both languages have a non-empty value for every key */
export function isComplete(): boolean {
  return getAllKeys().every(
    (key) =>
      typeof en[key as keyof typeof en] === 'string' &&
      en[key as keyof typeof en].length > 0 &&
      typeof om[key as keyof typeof om] === 'string' &&
      (om[key as keyof typeof om] as string).length > 0
  );
}
