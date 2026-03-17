import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';

// Detect browser language
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.toLowerCase();
  // Check if browser language starts with German
  if (browserLang.startsWith('de')) {
    return 'de';
  }
  // Default to English for all other languages
  return 'en';
};

export const changeLanguageToBrowserDefault = () => {
  const targetLang = getBrowserLanguage();
  i18n.changeLanguage(targetLang);
  localStorage.setItem('language', targetLang);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    lng: getBrowserLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;