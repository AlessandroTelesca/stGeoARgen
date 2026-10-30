import deJson from './de_organized.json';
import enJson from './en_organized.json';
import georgiDeJson from './georgi_messages.de.json';
import georgiEnJson from './georgi_messages.en.json';
import rewardsDeJson from './rewards_content.de.json';
import rewardsEnJson from './rewards_content.en.json';
import stationModulesDeJson from './stationModules.de.json';
import stationModulesEnJson from './stationModules.en.json';
import stationModuleEditorsDeJson from './stationModuleEditors.de.json';
import stationModuleEditorsEnJson from './stationModuleEditors.en.json';
import stationModulePlayersDeJson from './stationModulePlayers.de.json';
import stationModulePlayersEnJson from './stationModulePlayers.en.json';
import stationAdminDeJson from './stationAdmin.de.json';
import stationAdminEnJson from './stationAdmin.en.json';
import stationModulesExtraDeJson from './stationModulesExtra.de.json';
import stationModulesExtraEnJson from './stationModulesExtra.en.json';
import stationAdminTourDeJson from './stationAdminTour.de.json';
import stationAdminTourEnJson from './stationAdminTour.en.json';

export type Language = 'de' | 'en';

const de = {
	...deJson,
	...georgiDeJson,
	...rewardsDeJson,
	...stationModulesDeJson,
	...stationModuleEditorsDeJson,
	...stationModulePlayersDeJson,
	...stationAdminDeJson,
	...stationModulesExtraDeJson,
	...stationAdminTourDeJson,
};

export type TranslationDict = typeof de;

const en: TranslationDict = {
	...enJson,
	...georgiEnJson,
	...rewardsEnJson,
	...stationModulesEnJson,
	...stationModuleEditorsEnJson,
	...stationModulePlayersEnJson,
	...stationAdminEnJson,
	...stationModulesExtraEnJson,
	...stationAdminTourEnJson,
};

export const translations: Record<Language, TranslationDict> = { de, en };
