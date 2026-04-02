import deJson from './de_organized.json';
import enJson from './en_organized.json';
import georgiDeJson from './georgi_messages.de.json';
import georgiEnJson from './georgi_messages.en.json';

export type Language = 'de' | 'en';

const de = {
	...deJson,
	...georgiDeJson,
};

export type TranslationDict = typeof de;

const en: TranslationDict = {
	...enJson,
	...georgiEnJson,
};

export const translations: Record<Language, TranslationDict> = { de, en };
