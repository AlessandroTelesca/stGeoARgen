import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';
import nl from './locales/nl.json';

// Detect browser language
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.toLowerCase();
  // Check if browser language starts with 'de' for German, 'fr' for French, 'es' for Spanish, 'ru' for Russian, 'zh' for Chinese, 'nl' for Dutch, otherwise default to English
  if (browserLang.startsWith('de')) {
    return 'de';
  } else if (browserLang.startsWith('fr')) {
    return 'fr';
  } else if (browserLang.startsWith('es')) {
    return 'es';
  } else if (browserLang.startsWith('ru')) {
    return 'ru';
  } else if (browserLang.startsWith('zh')) {
    return 'zh';
  } else if (browserLang.startsWith('nl')) {
    return 'nl';
  }
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
      fr: { translation: fr },
      es: { translation: es },
      ru: { translation: ru },
      zh: { translation: zh },
      nl: { translation: nl },
    },
    lng: getBrowserLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;