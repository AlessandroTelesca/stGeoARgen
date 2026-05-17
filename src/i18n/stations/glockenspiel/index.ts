import deJson from './de.json';
import enJson from './en.json';
import type { Language } from '../../translations';

export interface StationTexts {
  stationName: string;
  description: string;
  longDescription: string;
  quizQuestion: string;
  quizOptions: string[];
}

const de: StationTexts = deJson;
const en: StationTexts = enJson;

const textsByLanguage: Record<Language, StationTexts> = {
  de,
  en,
};

export function getGlockenspielTexts(language: Language): StationTexts {
  return textsByLanguage[language] ?? de;
}
