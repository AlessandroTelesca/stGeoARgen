import deJson from './de.json';
import enJson from './en.json';
import type { Language } from '../../translations';

export interface BahnhofTexts {
  stationName: string;
  description: string;
  longDescription: string;
  quizQuestion: string;
  arStartTitle: string;
  arStartDescription: string;
  arStartButton: string;
  arStartingButton: string;
  arStartErrorFallback: string;
  trainStartButton: string;
  tourFrontText: string;
  tourBackText: string;
  tourInsideText: string;
  tourNextButton: string;
  tourTrainStartedLabel: string;
  tourDriveHint: string;
  quizOptions: string[];
}

const de: BahnhofTexts = deJson;
const en: BahnhofTexts = enJson;

const bahnhofTextsByLanguage: Record<Language, BahnhofTexts> = {
  de,
  en,
};

export function getBahnhofTexts(language: Language): BahnhofTexts {
  return bahnhofTextsByLanguage[language] ?? de;
}
