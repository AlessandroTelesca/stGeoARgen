import deJson from './de.json';
import enJson from './en.json';
import type { Language } from '../../translations';

export interface StationTexts {
  stationName: string;
  longDescription: string;
  backButtonLabel: string;
}

const de: StationTexts = deJson;
const en: StationTexts = enJson;

const textsByLanguage: Record<Language, StationTexts> = {
  de,
  en,
};

export function getSchwarzesTorTexts(language: Language): StationTexts {
  return textsByLanguage[language] ?? de;
}

