import { Language } from '../types';
/**
 * Look up a translation key for the given language.
 * Returns the key itself if no translation is found.
 */
export declare function t(key: string, language: Language): string;
/** Returns all translation keys defined in the English file (source of truth) */
export declare function getAllKeys(): string[];
/** Returns true if both languages have a non-empty value for every key */
export declare function isComplete(): boolean;
