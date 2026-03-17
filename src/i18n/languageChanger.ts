import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';

// Detect browser language
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.toLowerCase();
  // Check if browser language starts with 'de' for German, otherwise default to English
  if (browserLang.startsWith('de')) {
    return 'de';
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    lng: localStorage.getItem('language') || getBrowserLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;