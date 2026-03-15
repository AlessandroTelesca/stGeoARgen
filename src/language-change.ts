// language-change.ts
// Diese Datei fragt die Standardsprache des Browsers ab und setzt die Sprache für die Übersetzungen

import i18n from './i18n';

export const changeLanguageToBrowserDefault = () => {
  const browserLang = navigator.language.toLowerCase();
  let targetLang = 'en'; // Standard auf Englisch

  if (browserLang.startsWith('de')) {
    targetLang = 'de';
  }
  // Hier können weitere Sprachen hinzugefügt werden, z.B. if (browserLang.startsWith('fr')) { targetLang = 'fr'; }

  i18n.changeLanguage(targetLang);
  // Optional: Speichere die Sprache im localStorage
  localStorage.setItem('language', targetLang);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};