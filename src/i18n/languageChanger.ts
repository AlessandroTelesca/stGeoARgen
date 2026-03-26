import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
const LANGUAGE_STORAGE_KEY = 'language';

// Detect browser language
const getBrowserLanguage = (): SupportedLanguage => {
  const browserLang = navigator.language.toLowerCase();
  // Check if browser language starts with German
  if (browserLang.startsWith('de')) {
    return 'de';
  }
  // Default to English for all other languages
  return 'en';
};

const isSupportedLanguage = (language: string): language is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
};

const getInitialLanguage = (): SupportedLanguage => {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (savedLanguage && isSupportedLanguage(savedLanguage)) {
    return savedLanguage;
  }

  return getBrowserLanguage();
};

export const changeLanguageToBrowserDefault = () => {
  const targetLang = getBrowserLanguage();
  i18n.changeLanguage(targetLang);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, targetLang);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

i18n
  .use(
    resourcesToBackend((language: string) => {
      if (!isSupportedLanguage(language)) {
        return import('./locales/en.json');
      }

      if (language === 'de') {
        return import('./locales/de.json');
      }

      return import('./locales/en.json');
    })
  )
  .use(initReactI18next)
  .init({
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

i18n.on('languageChanged', (language) => {
  if (isSupportedLanguage(language)) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
  });

export default i18n;