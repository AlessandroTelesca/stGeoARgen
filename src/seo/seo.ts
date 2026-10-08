import type { Language } from '../i18n/translations';
import type { IndexablePath } from './routes';

// Öffentliche Basis-URL der App (ohne Slash am Ende). Über VITE_SITE_URL überschreibbar.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://stgeoargen.iiius.de').replace(/\/+$/, '');
export const SITE_NAME = 'St.GeoARgen';
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

type Localized = Record<Language, string>;

interface PageSeo {
  title: Localized;
  description: Localized;
  /** false = noindex (private/utility-Seiten) */
  indexable: boolean;
}

const DEFAULT_DESCRIPTION: Localized = {
  de: 'St.GeoARgen – der interaktive Augmented-Reality-Stadtrundgang durch St. Georgen im Schwarzwald. Entdecke Glockenspiel, Bahnhof, Phonomuseum, Schwarzes Tor und Klosterweiher, sammle Punkte und löse Gutscheine ein.',
  en: 'St.GeoARgen – the interactive augmented reality city tour of St. Georgen in the Black Forest. Discover the glockenspiel, train station, phono museum, Schwarzes Tor and Klosterweiher, collect points and redeem vouchers.',
};

// Metadaten je indexierbarem URL-Pfad (muss zu INDEXABLE_ROUTES passen). Andere Pfade sind noindex.
const PAGES: Record<IndexablePath, PageSeo> = {
  '/': {
    title: {
      de: 'St.GeoARgen – AR-Stadtrundgang durch St. Georgen im Schwarzwald',
      en: 'St.GeoARgen – AR City Tour of St. Georgen, Black Forest',
    },
    description: DEFAULT_DESCRIPTION,
    indexable: true,
  },
  '/paths': {
    title: {
      de: 'Themenpfade in St. Georgen | St.GeoARgen',
      en: 'Theme Trails in St. Georgen | St.GeoARgen',
    },
    description: {
      de: 'Der touristische Themenpfad durch St. Georgen: fünf Stationen zu Geschichte, Kultur und Natur – erlebbar mit Augmented Reality auf dem Smartphone.',
      en: 'The tourist theme trail through St. Georgen: five stations on history, culture and nature – brought to life with augmented reality on your smartphone.',
    },
    indexable: true,
  },
  '/glockenspiel': {
    title: {
      de: 'Glockenspiel in AR erleben | St.GeoARgen',
      en: 'Experience the Glockenspiel in AR | St.GeoARgen',
    },
    description: {
      de: 'Station Glockenspiel in St. Georgen: Komponiere deine eigene Melodie und erlebe das Glockenspiel in Augmented Reality.',
      en: 'Glockenspiel station in St. Georgen: compose your own melody and experience the glockenspiel in augmented reality.',
    },
    indexable: true,
  },
  '/bahnhof': {
    title: {
      de: 'Historischer Bahnhof St. Georgen in AR | St.GeoARgen',
      en: 'Historic St. Georgen Train Station in AR | St.GeoARgen',
    },
    description: {
      de: 'Station Bahnhof: Entdecke die Geschichte der Schwarzwaldbahn und des Bahnhofs St. Georgen interaktiv in Augmented Reality.',
      en: 'Train station stop: discover the history of the Black Forest Railway and St. Georgen station interactively in augmented reality.',
    },
    indexable: true,
  },
  '/phonomuseum': {
    title: {
      de: 'Phonomuseum St. Georgen in AR | St.GeoARgen',
      en: 'St. Georgen Phono Museum in AR | St.GeoARgen',
    },
    description: {
      de: 'Station Phonomuseum: Entdecke die Geschichte der Audiomedien und der Phonoindustrie in St. Georgen in Augmented Reality.',
      en: 'Phono museum stop: discover the history of audio media and the phono industry in St. Georgen in augmented reality.',
    },
    indexable: true,
  },
  '/schwarzes-tor': {
    title: {
      de: 'Schwarzes Tor – Zeitreise in AR | St.GeoARgen',
      en: 'Schwarzes Tor – Time Travel in AR | St.GeoARgen',
    },
    description: {
      de: 'Station Schwarzes Tor: Unternimm eine 360°-Zeitreise in die Vergangenheit von St. Georgen und erkunde historische Räume.',
      en: 'Schwarzes Tor stop: take a 360° journey into the past of St. Georgen and explore historic rooms.',
    },
    indexable: true,
  },
  '/klosterweiher': {
    title: {
      de: 'Klosterweiher St. Georgen in AR | St.GeoARgen',
      en: 'Klosterweiher (Monastery Pond) in AR | St.GeoARgen',
    },
    description: {
      de: 'Station Klosterweiher: Erkunde Natur und Tierwelt am Klosterweiher in St. Georgen im Schwarzwald mit Augmented Reality.',
      en: 'Klosterweiher stop: explore nature and wildlife at the monastery pond in St. Georgen in the Black Forest with augmented reality.',
    },
    indexable: true,
  },
  '/info': {
    title: {
      de: 'Über St.GeoARgen – Projekt & Hintergrund',
      en: 'About St.GeoARgen – Project & Background',
    },
    description: {
      de: 'Hintergrund zum Projekt St.GeoARgen: Wie der AR-Stadtrundgang durch St. Georgen entstanden ist, wer dahintersteht und was er bietet.',
      en: 'Background on the St.GeoARgen project: how the AR city tour of St. Georgen came about, who is behind it and what it offers.',
    },
    indexable: true,
  },
  '/impressum': {
    title: { de: 'Impressum | St.GeoARgen', en: 'Legal Notice | St.GeoARgen' },
    description: {
      de: 'Impressum und Anbieterkennzeichnung von St.GeoARgen.',
      en: 'Legal notice and provider information of St.GeoARgen.',
    },
    indexable: true,
  },
  '/datenschutz': {
    title: { de: 'Datenschutzerklärung | St.GeoARgen', en: 'Privacy Policy | St.GeoARgen' },
    description: {
      de: 'Datenschutzerklärung von St.GeoARgen: welche Daten verarbeitet werden und welche Rechte du hast.',
      en: 'Privacy policy of St.GeoARgen: which data is processed and what rights you have.',
    },
    indexable: true,
  },
};

// Titel für private bzw. nicht indexierbare Ansichten (noindex)
const PRIVATE_TITLES: Record<string, Localized> = {
  login: { de: 'Anmelden', en: 'Log in' },
  register: { de: 'Registrieren', en: 'Sign up' },
  'forgot-password': { de: 'Passwort vergessen', en: 'Forgot password' },
  profile: { de: 'Profil', en: 'Profile' },
  settings: { de: 'Einstellungen', en: 'Settings' },
  points: { de: 'Punkte', en: 'Points' },
  stations: { de: 'Stationen', en: 'Stations' },
  progress: { de: 'Fortschritt', en: 'Progress' },
  rewards: { de: 'Belohnungen', en: 'Rewards' },
  partner: { de: 'Partner-Bereich', en: 'Partner area' },
};

export interface ResolvedSeo {
  title: string;
  description: string;
  canonical: string;
  indexable: boolean;
  alternates: { hreflang: string; href: string }[];
}

const withLang = (path: string, lang: Language) => `${SITE_URL}${path}${lang === 'en' ? '?lang=en' : ''}`;

export function resolveSeo(pathname: string, view: string, language: Language, detailTitle?: string): ResolvedSeo {
  const path = pathname === '/home' ? '/' : pathname.replace(/\/+$/, '') || '/';
  const page = (PAGES as Record<string, PageSeo | undefined>)[path];
  const privateTitle = PRIVATE_TITLES[view];

  // Private Ansichten immer noindex, auch wenn die URL zufällig "/" ist
  if (privateTitle || !page) {
    const label = privateTitle?.[language] ?? detailTitle;
    return {
      title: label ? `${label} | ${SITE_NAME}` : SITE_NAME,
      description: DEFAULT_DESCRIPTION[language],
      // Selbstreferenz statt Verweis auf eine andere URL – kein Konflikt mit noindex
      canonical: withLang(path, language),
      indexable: false,
      alternates: [],
    };
  }

  // Pfad- und Stationsdetails laufen unter "/" – Titel anpassen, Canonical bleibt die Startseite
  const title = detailTitle && (view === 'path' || view === 'station')
    ? `${detailTitle} | ${SITE_NAME}`
    : page.title[language];

  return {
    title,
    description: page.description[language],
    canonical: withLang(path, language),
    indexable: true,
    alternates: [
      { hreflang: 'de', href: withLang(path, 'de') },
      { hreflang: 'en', href: withLang(path, 'en') },
      { hreflang: 'x-default', href: withLang(path, 'de') },
    ],
  };
}

