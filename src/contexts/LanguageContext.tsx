import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { translations, type Language } from '../i18n/translations';

function isSupportedLanguage(value: string): value is Language {
  return value === 'de' || value === 'en';
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem('language');
    if (stored && isSupportedLanguage(stored)) return stored;
  } catch {
    // Ignore storage access issues and fall back to browser language.
  }

  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  return browserLang === 'de' ? 'de' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  const setLanguage = useCallback((lang: Language) => {
    const nextLanguage = isSupportedLanguage(lang) ? lang : 'en';
    try {
      localStorage.setItem('language', nextLanguage);
    } catch {
      // Ignore storage access issues in restricted browsing contexts.
    }
    setLanguageState(nextLanguage);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[language] as Record<string, string>;
      let text = dict[key] ?? (translations['de'] as Record<string, string>)[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          const value = String(v);
          text = text
            .replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), value)
            .replace(new RegExp(`\\{${k}\\}`, 'g'), value);
        });
      }
      return text;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
