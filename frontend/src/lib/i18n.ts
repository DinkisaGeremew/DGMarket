import en from '../../../shared/src/i18n/en.json';
import om from '../../../shared/src/i18n/om.json';

export type Language = 'en' | 'om';

const translations: Record<Language, Record<string, string>> = { en, om };

export function t(key: string, language: Language): string {
  return translations[language]?.[key] ?? key;
}
