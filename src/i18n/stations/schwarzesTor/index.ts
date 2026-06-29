import deJson from './de.json';
import enJson from './en.json';
import type { Language } from '../../translations';

export interface StationTexts {
  // Station allgemein
  stationName: string;
  description: string;
  longDescription: string;
  backButtonLabel: string;

  // SchwarzesTorView
  zeitreiseStartButton: string;
  rewardHint: string;

  // ZeitreiseView
  zeitreiseTitle: string;
  zeitreiseSubtitle: string;
  zeitreiseStartTitle: string;
  zeitreiseStartDescription: string;
  zeitreiseStartButtonLabel: string;
  zeitreiseLoading: string;
  zeitreiseRoomSelect: string;

  // Raum-Labels
  roomKueche: string;
  roomWohnraum: string;
  roomScheune: string;
  roomArbeitsstube: string;

  // PanoramaView — allgemein
  panoramaLoading: string;
  panoramaBack: string;
  panoramaBackHome: string;
  panoramaClose: string;
  panoramaDragHint: string;
  panoramaWeiter: string;

  // PanoramaView — Intro-Texte pro Raum
  introKueche: string;
  introWohnraum: string;
  introScheune: string;
  introArbeitsstube: string;

  // PanoramaView — Raum-Titel
  introTitleKueche: string;
  introTitleWohnraum: string;
  introTitleScheune: string;
  introTitleArbeitsstube: string;

  // Completion Popup
  completionTitle: string;
  completionDescription: string;
  completionHomeButton: string;
  completionContinueButton: string;

  objectGarngaspelContent: string;
objectSpindelPresseContent: string;
objectButterfassContent: string;
objectWaagenContent: string;
objectTrommelwaschmaschineContent: string;
objectFlachsbrecheContent: string;
objectSchleifsteinContent: string;
objectDrehbankContent: string;
objectWanduhrContent: string;
objectPfanneContent: string;
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
