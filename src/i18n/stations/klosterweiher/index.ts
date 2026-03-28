import deJson from './de.json';
import enJson from './en.json';
import type { Language } from '../../translations';

export interface KlosterweiherTexts {
  stationName: string;
  description: string;
  longDescription: string;
  quizQuestion: string;
  quizOptions: string[];
  arStartTitleReady: string;
  arStartTitleLoading: string;
  arStartHintLoading: string;
  arStartButtonStarting: string;
  arStartButtonReady: string;
  arStartButtonLoading: string;
  tapInstruction: string;
  dragInstruction: string;
  waitingForGround: string;
  waitingForReadyPrompt: string;
  waitingForReadyButton: string;
  waitingForReadyLoading: string;
  fishingInstruction: string;
  fishingStartButton: string;
  fishActionRelease: string;
  fishActionLearnMore: string;
  fishCaughtPrefix: string;
  fishCaughtSuffix: string;
  fishInfoTitleFallback: string;
  fishScientificNameFallback: string;
  fishInfoLoading: string;
  fishInfoUnavailable: string;
  fishInfoHabitat: string;
  fishInfoDiet: string;
  fishInfoDimensions: string;
  fishInfoSize: string;
  fishInfoWeight: string;
  fishInfoFeatures: string;
  fishInfoLifespan: string;
  fishInfoConservation: string;
  fishInfoFunFact: string;
  close: string;
}

const de: KlosterweiherTexts = deJson;
const en: KlosterweiherTexts = enJson;

const klosterweiherTextsByLanguage: Record<Language, KlosterweiherTexts> = {
  de,
  en,
};

export function getKlosterweiherTexts(language: Language): KlosterweiherTexts {
  return klosterweiherTextsByLanguage[language] ?? de;
}
