import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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

let isReady = false;

const loadLanguageResources = async (language: string) => {
  try {
    const response = await fetch(`/locales/${language}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${language}.json`);
    }
    const resources = await response.json();
    i18n.addResourceBundle(language, 'translation', resources, true, true);
    isReady = true;
  } catch (error) {
    console.error(`Error loading language resources for ${language}:`, error);
  }
};

export const changeLanguageToBrowserDefault = async () => {
  const targetLang = getBrowserLanguage();
  await loadLanguageResources(targetLang);
  i18n.changeLanguage(targetLang);
  localStorage.setItem('language', targetLang);
};

export const changeLanguage = async (language: string) => {
  await loadLanguageResources(language);
  i18n.changeLanguage(language);
  localStorage.setItem('language', language);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

export const getIsReady = () => {
  return isReady;
};

i18n
  .use(initReactI18next)
  .init({
    lng: getBrowserLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Load initial language resources
loadLanguageResources(getBrowserLanguage());

export default i18n;