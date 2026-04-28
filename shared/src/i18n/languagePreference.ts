import { Language } from '../types';

/**
 * Simple in-memory language preference store.
 * In the frontend this maps to localStorage; in tests it's in-memory.
 */
const store: Map<string, Language> = new Map();

export function setLanguage(userId: string, language: Language): void {
  store.set(userId, language);
}

export function getLanguage(userId: string): Language {
  return store.get(userId) ?? 'en';
}

export function _reset(): void {
  store.clear();
}
