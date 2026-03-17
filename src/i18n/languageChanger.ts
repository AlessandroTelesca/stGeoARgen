import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';
import nl from './locales/nl.json';
import da from './locales/da.json';
import pl from './locales/pl.json';
import uk from './locales/uk.json';
import fi from './locales/fi.json';
import no from './locales/no.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import sv from './locales/sv.json';
import be from './locales/be.json';

// Detect browser language
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.toLowerCase();
  // Check if browser language starts with supported languages
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
  } else if (browserLang.startsWith('da')) {
    return 'da';
  } else if (browserLang.startsWith('pl')) {
    return 'pl';
  } else if (browserLang.startsWith('uk')) {
    return 'uk';
  } else if (browserLang.startsWith('fi')) {
    return 'fi';
  } else if (browserLang.startsWith('no') || browserLang.startsWith('nb')) {
    return 'no';
  } else if (browserLang.startsWith('ja')) {
    return 'ja';
  } else if (browserLang.startsWith('ko')) {
    return 'ko';
  } else if (browserLang.startsWith('sv')) {
    return 'sv';
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
      da: { translation: da },
      pl: { translation: pl },
      uk: { translation: uk },
      fi: { translation: fi },
      no: { translation: no },
      ja: { translation: ja },
      ko: { translation: ko },
      sv: { translation: sv },
      be: { translation: be },
    },
    lng: getBrowserLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;