import React, { createContext, useContext, useState } from 'react';
import { type Language, t as translate } from '../lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const stored = (localStorage.getItem('language') as Language) ?? 'en';
  const [language, setLang] = useState<Language>(stored);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('language', lang);
    setLang(lang);
  };

  const t = (key: string) => translate(key, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
