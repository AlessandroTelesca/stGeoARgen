import deJson from './de.json';
import enJson from './en.json';
import type { Language } from '../../translations';

export interface StationTexts {
  stationName: string;
  description: string;
  longDescription: string;
  quizQuestion: string;
  quizOptions: string[];
  quizIntroTitle: string;
  quizIntroDescription: string;
  quizIntroStart: string;
  quizSoundPrompt: string;
  playSound: string;
  selectAnswer: string;
  feedbackCorrectTitle: string;
  feedbackWrongTitle: string;
  feedbackCorrectBody: string;
  feedbackWrongBody: string;
  revealInstrument: string;
  dragInstruction: string;
  continueButton: string;
  finishTitle: string;
  finishSuccess: string;
  finishFailure: string;
  finishScore: string;
  completionBlocked: string;
  completionBlockedHint: string;
  arStartTitle: string;
  arStartDescription: string;
  arStartButton: string;
  arStartingButton: string;
  arStartErrorFallback: string;
  mediumLesson: {
    title: string;
    subtitle: string;
    playLabel: string;
    answerLabel: string;
    continueLabel: string;
    retryLabel: string;
    startMainQuizLabel: string;
    resultTitle: string;
    resultBody: string;
    mediumNames: {
      phonograph: string;
      gramophone: string;
      plattenspieler: string;
    };
    questions: Array<{
      prompt: string;
      correct: 'phonograph' | 'gramophone' | 'plattenspieler';
      explanation: string;
    }>;
  };
  yourTurn: {
    title: string;
    subtitle: string;
    melodyLabel: string;
    melodyHint: string;
    notesCountLabel: string;
    composeLabel: string;
    clearLabel: string;
    removeLastLabel: string;
    playByMediumLabel: string;
    playedBadge: string;
    continueLabel: string;
    requiredPlayHint: string;
  };
  questions: Array<{
    prompt: string;
    options: string[];
    correctIndex: number;
    instrumentName: string;
    soundType: 'phonograph' | 'gramophone' | 'plattenspieler';
    soundExplanation: string;
  }>;
}

const de: StationTexts = deJson;
const en: StationTexts = enJson;

const textsByLanguage: Record<Language, StationTexts> = {
  de,
  en,
};

export function getPhonomuseumTexts(language: Language): StationTexts {
  return textsByLanguage[language] ?? de;
}
