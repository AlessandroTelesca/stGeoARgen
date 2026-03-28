import deJson from './de_organized.json';
import enJson from './en_organized.json';

export type Language = 'de' | 'en';

const de = deJson;

export type TranslationDict = typeof de;

const en: TranslationDict = enJson;

export const translations: Record<Language, TranslationDict> = { de, en };
