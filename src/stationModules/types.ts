/**
 * Module einer Station aus der Stationsverwaltung.
 *
 * Eine Station besteht aus einer geordneten Liste von Modulen, die beim Start der Reihe nach
 * abgespielt werden (Erzähltext, Bildfolge, Vorher/Nachher, Quiz, …). Gespeichert wird die Liste
 * als JSON in custom_stations.modules (Validierung: api/station_modules_lib.php).
 *
 * Texte folgen dem Muster der übrigen Stationsdaten: `*_de` ist Pflicht (sofern nicht als
 * `| null` markiert), `*_en` ist optional (null → die App zeigt den deutschen Text).
 *
 * Medien (Bilder, Audio) sind über den Typparameter `M` austauschbar:
 * - API / Datenbank: Dateiname in api/uploads/stations/ (beim Speichern neue Dateien als "new:N",
 *   N = Index in `files[]` der Anfrage)
 * - Editor: ImageItem (vorhandene Datei oder neue, noch nicht hochgeladene Datei)
 * - Player: fertige URL
 * Umgewandelt wird ausschließlich mit `mapModuleMedia` (siehe unten).
 */

export type ModuleType =
  | 'story'
  | 'slideshow'
  | 'before_after'
  | 'ar_panorama'
  | 'ar_discover'
  | 'quiz'
  | 'estimate'
  | 'timeline'
  | 'hotspots'
  | 'onsite_code'
  | 'audio'
  | 'sequence'
  | 'photo';

export const MODULE_TYPES: readonly ModuleType[] = [
  'story',
  'slideshow',
  'before_after',
  'ar_panorama',
  'ar_discover',
  'quiz',
  'estimate',
  'timeline',
  'hotspots',
  'onsite_code',
  'audio',
  'sequence',
  'photo',
];

export const MAX_MODULES_PER_STATION = 12;

/** Höchstzahl Punkte im Modul ar_discover (api/station_modules_lib.php: STATION_MAX_AR_POINTS) */
export const MAX_AR_DISCOVER_POINTS = 12;

/** Felder, die jedes Modul hat */
interface ModuleBase {
  /** Stabile ID innerhalb der Station (z. B. "m-k3j9x2"), dient als React-Key */
  id: string;
  /** Optionale Überschrift im Player; null → Standardname des Modultyps */
  title_de: string | null;
  title_en: string | null;
}

/** Erzähltext: Text mit optionalem Bild – als normaler Text, von Drache Georgi erzählt oder als Zitat */
export interface StoryModule<M = string> extends ModuleBase {
  type: 'story';
  style: 'text' | 'georgi' | 'quote';
  text_de: string; // max. 5000
  text_en: string | null;
  image: M | null;
  /** Nur style 'quote': Wer hat es gesagt? (z. B. "Anna Weber, Uhrmacherin, 1932") */
  quote_source: string | null; // max. 150
}

export interface SlideItem<M = string> {
  image: M;
  text_de: string; // max. 1000
  text_en: string | null;
}

/** Bildfolge: 1–10 Bilder mit Text, Bild für Bild durchklicken */
export interface SlideshowModule<M = string> extends ModuleBase {
  type: 'slideshow';
  slides: SlideItem<M>[];
}

/**
 * Vorher/Nachher: historisches Bild gegen heute.
 * - slider: zwei Bilder mit verschiebbarer Trennlinie
 * - fade:   zwei Bilder, Überblenden per Regler
 * - camera: historisches Bild halbtransparent über dem Live-Kamerabild (after_image = null)
 */
export interface BeforeAfterModule<M = string> extends ModuleBase {
  type: 'before_after';
  mode: 'slider' | 'fade' | 'camera';
  before_image: M;
  before_label_de: string; // max. 40, z. B. "1910" oder "Damals"
  before_label_en: string | null;
  /** Pflicht außer bei mode 'camera' */
  after_image: M | null;
  after_label_de: string; // max. 40, z. B. "Heute"
  after_label_en: string | null;
  text_de: string | null; // max. 2000
  text_en: string | null;
}

/** Quizfrage – gleiches Format wie bisher (custom_stations.quiz_questions) */
export interface QuizQuestion<M = string> {
  question_de: string; // max. 255
  question_en: string | null;
  options_de: string[]; // 2–6, alle ausgefüllt
  /** Entweder alle Optionen auf Englisch oder null */
  options_en: string[] | null;
  correct_answer: number;
  /** Optionales Bild über der Frage */
  image: M | null;
  /** Optionaler Ton als Frage (nur Modul 'quiz'); optional, damit Altdaten gültig bleiben */
  audio?: M | null;
  /** Optionale Erklärung nach der richtigen Antwort (nur Modul 'quiz') */
  explanation_de: string | null; // max. 1000
  explanation_en: string | null;
}

/** AR-Rundumblick: 360°-Bild oder Live-Kamera, Bilder rundum, danach Quiz (bisher Stationstyp panorama_quiz) */
export interface ArPanoramaModule<M = string> extends ModuleBase {
  type: 'ar_panorama';
  background: 'panorama' | 'camera';
  /** Pflicht bei background 'panorama'; bei 'camera' optional (bleibt fürs Zurückschalten erhalten) */
  panorama_image: M | null;
  slides: SlideItem<M>[]; // 0–9
  questions: QuizQuestion<M>[]; // 1–10
}

/** Entdeckbarer Punkt im AR-Entdecken: Richtung relativ zum Startblick, Info-Karte beim Anvisieren */
export interface ArDiscoverPoint<M = string> {
  /** Stabil (Reihenfolge ändert die ID nicht), /^[a-zA-Z0-9_-]{1,20}$/ */
  id: string;
  /** −180…180, positiv = rechts vom Startblick */
  yaw: number;
  /** −85…85, positiv = oben */
  pitch: number;
  /** Größe des Punkts und seines Trefferbereichs */
  size: 'small' | 'medium' | 'large';
  title_de: string; // max. 80
  title_en: string | null;
  text_de: string; // max. 1000
  text_en: string | null;
  image: M | null;
}

/**
 * AR-Entdecken: 360°-Bild oder Live-Kamera mit frei platzierten Punkten. Ein Laser aus der Bildmitte;
 * wer einen Punkt etwa 1,5 s anvisiert (oder antippt), öffnet seine Info. Mehrfach pro Station erlaubt.
 */
export interface ArDiscoverModule<M = string> extends ModuleBase {
  type: 'ar_discover';
  background: 'panorama' | 'camera';
  /** Pflicht bei 'panorama'; bei 'camera' optionales Referenzbild (nur Editor, Desktop, Vorschau) */
  panorama_image: M | null;
  intro_de: string | null; // max. 500
  intro_en: string | null;
  points: ArDiscoverPoint<M>[]; // 1–12
  /** true: Weiter erst, wenn alle Punkte entdeckt sind */
  require_all: boolean;
}

/** Quiz: 1–10 Multiple-Choice-Fragen (Variante Wahr/Falsch = 2 Optionen) */
export interface QuizModule<M = string> extends ModuleBase {
  type: 'quiz';
  questions: QuizQuestion<M>[];
  /**
   * Bestehensgrenze. Mindestanzahl auf Anhieb richtiger Antworten (1 … Fragenzahl).
   * null/fehlend = keine Grenze.
   */
  pass_threshold?: number | null;
}

/** Schätzfrage: Zahl per Schieberegler schätzen, danach Auflösung */
export interface EstimateModule extends ModuleBase {
  type: 'estimate';
  question_de: string; // max. 255
  question_en: string | null;
  min: number;
  max: number; // > min
  step: number; // > 0, (max - min) / step <= 10000
  answer: number; // min <= answer <= max
  /** Abweichung, die noch als Volltreffer zählt (>= 0) */
  tolerance: number;
  unit_de: string | null; // max. 20, z. B. "Meter", "Jahre"
  unit_en: string | null;
  explanation_de: string | null; // max. 1000
  explanation_en: string | null;
  /**
   * Bestehensgrenze. Nur 1 = muss gelöst werden.
   * null/fehlend = keine Grenze.
   */
  pass_threshold?: number | null;
}

export interface TimelineEntry<M = string> {
  year: string; // max. 20, frei: "1084", "um 1500", "1950er"
  text_de: string; // max. 500
  text_en: string | null;
  image: M | null;
}

/** Zeitstrahl: 2–12 Einträge Jahr + Ereignis */
export interface TimelineModule<M = string> extends ModuleBase {
  type: 'timeline';
  entries: TimelineEntry<M>[];
}

export interface Hotspot {
  /** Position relativ zum Bild, 0–1 (links/oben = 0) */
  x: number;
  y: number;
  title_de: string; // max. 80
  title_en: string | null;
  text_de: string; // max. 1000
  text_en: string | null;
}

/** Bild mit Infopunkten: 1–8 antippbare Punkte auf einem Bild */
export interface HotspotsModule<M = string> extends ModuleBase {
  type: 'hotspots';
  image: M;
  intro_de: string | null; // max. 500
  intro_en: string | null;
  spots: Hotspot[];
}

/** Vor-Ort-Rätsel: Die Antwort findet man nur vor Ort (Inschrift, Jahreszahl, Anzahl Fenster …) */
export interface OnsiteCodeModule<M = string> extends ModuleBase {
  type: 'onsite_code';
  task_de: string; // max. 500
  task_en: string | null;
  input: 'text' | 'number';
  /** 1–5 akzeptierte Antworten (Groß-/Kleinschreibung und Leerzeichen egal), max. 100 Zeichen */
  answers: string[];
  hint_de: string | null; // max. 500
  hint_en: string | null;
  image: M | null;
  /** Wird nach dem Lösen gezeigt */
  solution_de: string | null; // max. 1000
  solution_en: string | null;
  /**
   * Bestehensgrenze. Nur 1 = muss gelöst werden.
   * null/fehlend = keine Grenze.
   */
  pass_threshold?: number | null;
}

/** Hörstück: Audio (MP3/M4A) mit optionalem Bild und Text zum Mitlesen */
export interface AudioModule<M = string> extends ModuleBase {
  type: 'audio';
  audio: M;
  image: M | null;
  /** z. B. "Erzählt von Hans Maier, Zeitzeuge" */
  speaker: string | null; // max. 150
  transcript_de: string | null; // max. 10000
  transcript_en: string | null;
}

export interface SequenceItem<M = string> {
  text_de: string; // max. 200
  text_en: string | null;
  image: M | null;
  /** Wird nach dem Lösen gezeigt, z. B. die Jahreszahl ("1890"); max. 20 */
  label: string | null;
}

/**
 * Reihenfolge: 3–6 Einträge in die richtige Reihenfolge bringen (Ereignisse, Arbeitsschritte).
 * `items` steht in der RICHTIGEN Reihenfolge; der Player mischt sie.
 */
export interface SequenceModule<M = string> extends ModuleBase {
  type: 'sequence';
  task_de: string; // max. 255
  task_en: string | null;
  items: SequenceItem<M>[];
  explanation_de: string | null; // max. 1000
  explanation_en: string | null;
  /**
   * Bestehensgrenze. Nur 1 = muss gelöst werden.
   * null/fehlend = keine Grenze.
   */
  pass_threshold?: number | null;
}

/**
 * Fotomoment: Erinnerungsfoto mit Rahmen am Ort aufnehmen und speichern/teilen.
 * Das Foto bleibt auf dem Gerät (kein Upload).
 */
export interface PhotoModule extends ModuleBase {
  type: 'photo';
  prompt_de: string; // max. 255, z. B. "Mach ein Foto vor dem Schwarzen Tor"
  prompt_en: string | null;
  /** badge: Georgi-Plakette + Beschriftung unten; polaroid: weißer Rahmen mit Beschriftung */
  frame: 'badge' | 'polaroid';
  /** Startkamera: Rückkamera (Ort) oder Frontkamera (Selfie) – umschaltbar im Player */
  camera: 'environment' | 'user';
  /** Beschriftung im Rahmen; null → Stationsname */
  caption_de: string | null; // max. 60
  caption_en: string | null;
}

export type StationModule<M = string> =
  | StoryModule<M>
  | SlideshowModule<M>
  | BeforeAfterModule<M>
  | ArPanoramaModule<M>
  | ArDiscoverModule<M>
  | QuizModule<M>
  | EstimateModule
  | TimelineModule<M>
  | HotspotsModule<M>
  | OnsiteCodeModule<M>
  | AudioModule<M>
  | SequenceModule<M>
  | PhotoModule;

export type ModuleOfType<T extends ModuleType, M = string> = Extract<StationModule<M>, { type: T }>;

/** Welche Art Datei ein Medienfeld erwartet (Upload-Filter, Serverprüfung) */
export type MediaKind = 'image' | 'panorama' | 'audio';

/**
 * Wandelt alle Medienfelder eines Moduls um (Dateiname ↔ ImageItem ↔ URL).
 * Einzige Stelle, die weiß, wo in welchem Modultyp Medien stecken.
 */
export function mapModuleMedia<A, B>(module: StationModule<A>, map: (media: A, kind: MediaKind) => B): StationModule<B> {
  const opt = (media: A | null, kind: MediaKind = 'image'): B | null => (media === null ? null : map(media, kind));
  const slide = (s: SlideItem<A>): SlideItem<B> => ({ ...s, image: map(s.image, 'image') });
  const question = (q: QuizQuestion<A>): QuizQuestion<B> => ({ ...q, image: opt(q.image), audio: opt(q.audio ?? null, 'audio') });

  switch (module.type) {
    case 'story':
      return { ...module, image: opt(module.image) };
    case 'slideshow':
      return { ...module, slides: module.slides.map(slide) };
    case 'before_after':
      return { ...module, before_image: map(module.before_image, 'image'), after_image: opt(module.after_image) };
    case 'ar_panorama':
      return {
        ...module,
        panorama_image: opt(module.panorama_image, 'panorama'),
        slides: module.slides.map(slide),
        questions: module.questions.map(question),
      };
    case 'ar_discover':
      return {
        ...module,
        panorama_image: opt(module.panorama_image, 'panorama'),
        points: module.points.map((point) => ({ ...point, image: opt(point.image) })),
      };
    case 'quiz':
      return { ...module, questions: module.questions.map(question) };
    case 'estimate':
      return module;
    case 'timeline':
      return { ...module, entries: module.entries.map((e) => ({ ...e, image: opt(e.image) })) };
    case 'hotspots':
      return { ...module, image: map(module.image, 'image') };
    case 'onsite_code':
      return { ...module, image: opt(module.image) };
    case 'audio':
      return { ...module, audio: map(module.audio, 'audio'), image: opt(module.image) };
    case 'sequence':
      return { ...module, items: module.items.map((item) => ({ ...item, image: opt(item.image) })) };
    case 'photo':
      return module;
  }
}

/** Neue, kurze Modul-ID */
export function newModuleId(): string {
  return `m-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

/** Neue, kurze Punkt-ID für ar_discover (passt zu /^[a-zA-Z0-9_-]{1,20}$/) */
export function newArPointId(): string {
  return `p-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

/** Text in der aktuellen Sprache (Englisch fällt auf Deutsch zurück) */
export function pickLang(lang: 'de' | 'en', de: string, en: string | null | undefined): string;
export function pickLang(lang: 'de' | 'en', de: string | null, en: string | null | undefined): string | null;
export function pickLang(lang: 'de' | 'en', de: string | null, en: string | null | undefined): string | null {
  return (lang === 'en' && en && en.trim()) || de;
}
