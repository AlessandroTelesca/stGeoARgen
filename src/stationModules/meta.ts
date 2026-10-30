import {
  BookOpen,
  CircleHelp,
  Crosshair,
  GalleryHorizontal,
  Gauge,
  Headphones,
  History,
  KeyRound,
  Camera,
  ListOrdered,
  Orbit,
  SquareSplitHorizontal,
  type LucideIcon,
} from 'lucide-react';
import type { ImageItem } from '../components/StationAdminPanel/adminFormParts';
import {
  newModuleId,
  type ModuleOfType,
  type ModuleType,
  type QuizQuestion,
  type StationModule,
} from './types';

/**
 * Metadaten der Modultypen: Name, Icon, Gruppe in der Modulbibliothek, Varianten (Presets)
 * und Stationsvorlagen. Texte über t(); Schlüssel in src/i18n/stationModules.{de,en}.json.
 */

/** Modul im Editor: Medien sind ImageItems, Pflichtbilder dürfen bis zum Speichern fehlen (null) */
export type DraftMedia = ImageItem | null;
export type DraftModule = StationModule<DraftMedia>;
export type DraftModuleOfType<T extends ModuleType> = ModuleOfType<T, DraftMedia>;

export type ModuleCategory = 'tell' | 'discover' | 'play';

export const MODULE_CATEGORIES: { id: ModuleCategory; labelKey: string }[] = [
  { id: 'tell', labelKey: 'moduleCategoryTell' },
  { id: 'discover', labelKey: 'moduleCategoryDiscover' },
  { id: 'play', labelKey: 'moduleCategoryPlay' },
];

export interface ModulePreset<T extends ModuleType = ModuleType> {
  id: string;
  labelKey: string;
  descriptionKey: string;
  create: () => DraftModuleOfType<T>;
}

export interface ModuleMeta<T extends ModuleType = ModuleType> {
  type: T;
  icon: LucideIcon;
  labelKey: string;
  descriptionKey: string;
  category: ModuleCategory;
  /** Darf höchstens einmal pro Station vorkommen */
  singleton?: boolean;
  presets: ModulePreset<T>[];
}

const base = () => ({ id: newModuleId(), title_de: null, title_en: null });

export function emptyQuestion(optionCount = 4): QuizQuestion<DraftMedia> {
  return {
    question_de: '',
    question_en: null,
    options_de: Array.from({ length: optionCount }, () => ''),
    options_en: null,
    correct_answer: 0,
    image: null,
    explanation_de: null,
    explanation_en: null,
  };
}

/** Typsicheres Nachschlagen: MODULE_META[type] */
export const MODULE_META: { [T in ModuleType]: ModuleMeta<T> } = {
  story: {
    type: 'story',
    icon: BookOpen,
    labelKey: 'moduleStory',
    descriptionKey: 'moduleStoryDesc',
    category: 'tell',
    presets: [
      {
        id: 'text',
        labelKey: 'presetStoryText',
        descriptionKey: 'presetStoryTextDesc',
        create: () => ({ ...base(), type: 'story', style: 'text', text_de: '', text_en: null, image: null, quote_source: null }),
      },
      {
        id: 'georgi',
        labelKey: 'presetStoryGeorgi',
        descriptionKey: 'presetStoryGeorgiDesc',
        create: () => ({ ...base(), type: 'story', style: 'georgi', text_de: '', text_en: null, image: null, quote_source: null }),
      },
      {
        id: 'quote',
        labelKey: 'presetStoryQuote',
        descriptionKey: 'presetStoryQuoteDesc',
        create: () => ({ ...base(), type: 'story', style: 'quote', text_de: '', text_en: null, image: null, quote_source: '' }),
      },
    ],
  },
  slideshow: {
    type: 'slideshow',
    icon: GalleryHorizontal,
    labelKey: 'moduleSlideshow',
    descriptionKey: 'moduleSlideshowDesc',
    category: 'tell',
    presets: [
      {
        id: 'default',
        labelKey: 'moduleSlideshow',
        descriptionKey: 'moduleSlideshowDesc',
        create: () => ({ ...base(), type: 'slideshow', slides: [] }),
      },
    ],
  },
  audio: {
    type: 'audio',
    icon: Headphones,
    labelKey: 'moduleAudio',
    descriptionKey: 'moduleAudioDesc',
    category: 'tell',
    presets: [
      {
        id: 'default',
        labelKey: 'moduleAudio',
        descriptionKey: 'moduleAudioDesc',
        create: () => ({ ...base(), type: 'audio', audio: null, image: null, speaker: null, transcript_de: null, transcript_en: null }),
      },
    ],
  },
  timeline: {
    type: 'timeline',
    icon: History,
    labelKey: 'moduleTimeline',
    descriptionKey: 'moduleTimelineDesc',
    category: 'tell',
    presets: [
      {
        id: 'default',
        labelKey: 'moduleTimeline',
        descriptionKey: 'moduleTimelineDesc',
        create: () => ({
          ...base(),
          type: 'timeline',
          entries: Array.from({ length: 3 }, () => ({ year: '', text_de: '', text_en: null, image: null })),
        }),
      },
    ],
  },
  before_after: {
    type: 'before_after',
    icon: SquareSplitHorizontal,
    labelKey: 'moduleBeforeAfter',
    descriptionKey: 'moduleBeforeAfterDesc',
    category: 'discover',
    presets: (['slider', 'fade', 'camera'] as const).map((mode) => ({
      id: mode,
      labelKey: `presetBeforeAfter_${mode}`,
      descriptionKey: `presetBeforeAfter_${mode}Desc`,
      create: () => ({
        ...base(),
        type: 'before_after' as const,
        mode,
        before_image: null,
        before_label_de: 'Damals',
        before_label_en: 'Then',
        after_image: null,
        after_label_de: 'Heute',
        after_label_en: 'Today',
        text_de: null,
        text_en: null,
      }),
    })),
  },
  ar_panorama: {
    type: 'ar_panorama',
    icon: Orbit,
    labelKey: 'moduleArPanorama',
    descriptionKey: 'moduleArPanoramaDesc',
    category: 'discover',
    singleton: true,
    presets: (['camera', 'panorama'] as const).map((background) => ({
      id: background,
      labelKey: `presetArPanorama_${background}`,
      descriptionKey: `presetArPanorama_${background}Desc`,
      create: () => ({
        ...base(),
        type: 'ar_panorama' as const,
        background,
        panorama_image: null,
        slides: [],
        questions: [emptyQuestion()],
      }),
    })),
  },
  hotspots: {
    type: 'hotspots',
    icon: Crosshair,
    labelKey: 'moduleHotspots',
    descriptionKey: 'moduleHotspotsDesc',
    category: 'discover',
    presets: [
      {
        id: 'default',
        labelKey: 'moduleHotspots',
        descriptionKey: 'moduleHotspotsDesc',
        create: () => ({ ...base(), type: 'hotspots', image: null, intro_de: null, intro_en: null, spots: [] }),
      },
    ],
  },
  quiz: {
    type: 'quiz',
    icon: CircleHelp,
    labelKey: 'moduleQuiz',
    descriptionKey: 'moduleQuizDesc',
    category: 'play',
    presets: [
      {
        id: 'single',
        labelKey: 'presetQuizSingle',
        descriptionKey: 'presetQuizSingleDesc',
        create: () => ({ ...base(), type: 'quiz', questions: [emptyQuestion()] }),
      },
      {
        id: 'round',
        labelKey: 'presetQuizRound',
        descriptionKey: 'presetQuizRoundDesc',
        create: () => ({ ...base(), type: 'quiz', questions: [emptyQuestion(), emptyQuestion(), emptyQuestion()] }),
      },
      {
        id: 'true_false',
        labelKey: 'presetQuizTrueFalse',
        descriptionKey: 'presetQuizTrueFalseDesc',
        create: () => ({
          ...base(),
          type: 'quiz',
          questions: [{ ...emptyQuestion(2), options_de: ['Wahr', 'Falsch'], options_en: ['True', 'False'] }],
        }),
      },
    ],
  },
  estimate: {
    type: 'estimate',
    icon: Gauge,
    labelKey: 'moduleEstimate',
    descriptionKey: 'moduleEstimateDesc',
    category: 'play',
    presets: [
      {
        id: 'year',
        labelKey: 'presetEstimateYear',
        descriptionKey: 'presetEstimateYearDesc',
        create: () => ({
          ...base(),
          type: 'estimate',
          question_de: '',
          question_en: null,
          min: 1000,
          max: 2025,
          step: 1,
          answer: 1500,
          tolerance: 10,
          unit_de: null,
          unit_en: null,
          explanation_de: null,
          explanation_en: null,
        }),
      },
      {
        id: 'number',
        labelKey: 'presetEstimateNumber',
        descriptionKey: 'presetEstimateNumberDesc',
        create: () => ({
          ...base(),
          type: 'estimate',
          question_de: '',
          question_en: null,
          min: 0,
          max: 100,
          step: 1,
          answer: 50,
          tolerance: 5,
          unit_de: '',
          unit_en: null,
          explanation_de: null,
          explanation_en: null,
        }),
      },
    ],
  },
  onsite_code: {
    type: 'onsite_code',
    icon: KeyRound,
    labelKey: 'moduleOnsiteCode',
    descriptionKey: 'moduleOnsiteCodeDesc',
    category: 'play',
    presets: (['number', 'text'] as const).map((input) => ({
      id: input,
      labelKey: `presetOnsiteCode_${input}`,
      descriptionKey: `presetOnsiteCode_${input}Desc`,
      create: () => ({
        ...base(),
        type: 'onsite_code' as const,
        task_de: '',
        task_en: null,
        input,
        answers: [''],
        hint_de: null,
        hint_en: null,
        image: null,
        solution_de: null,
        solution_en: null,
      }),
    })),
  },
  sequence: {
    type: 'sequence',
    icon: ListOrdered,
    labelKey: 'moduleSequence',
    descriptionKey: 'moduleSequenceDesc',
    category: 'play',
    presets: [
      {
        id: 'chronology',
        labelKey: 'presetSequenceChronology',
        descriptionKey: 'presetSequenceChronologyDesc',
        create: () => ({
          ...base(),
          type: 'sequence',
          task_de: 'Bringe die Ereignisse in die richtige Reihenfolge.',
          task_en: 'Put the events in the right order.',
          items: Array.from({ length: 4 }, () => ({ text_de: '', text_en: null, image: null, label: '' })),
          explanation_de: null,
          explanation_en: null,
        }),
      },
      {
        id: 'steps',
        labelKey: 'presetSequenceSteps',
        descriptionKey: 'presetSequenceStepsDesc',
        create: () => ({
          ...base(),
          type: 'sequence',
          task_de: 'In welcher Reihenfolge geht es?',
          task_en: 'In which order does it happen?',
          items: Array.from({ length: 4 }, () => ({ text_de: '', text_en: null, image: null, label: null })),
          explanation_de: null,
          explanation_en: null,
        }),
      },
    ],
  },
  photo: {
    type: 'photo',
    icon: Camera,
    labelKey: 'modulePhoto',
    descriptionKey: 'modulePhotoDesc',
    category: 'discover',
    presets: [
      {
        id: 'place',
        labelKey: 'presetPhotoPlace',
        descriptionKey: 'presetPhotoPlaceDesc',
        create: () => ({ ...base(), type: 'photo', prompt_de: '', prompt_en: null, frame: 'badge', camera: 'environment', caption_de: null, caption_en: null }),
      },
      {
        id: 'selfie',
        labelKey: 'presetPhotoSelfie',
        descriptionKey: 'presetPhotoSelfieDesc',
        create: () => ({ ...base(), type: 'photo', prompt_de: '', prompt_en: null, frame: 'polaroid', camera: 'user', caption_de: null, caption_en: null }),
      },
    ],
  },
};

/** Reihenfolge in der Modulbibliothek */
export const MODULE_ORDER: ModuleType[] = [
  'story',
  'slideshow',
  'audio',
  'timeline',
  'before_after',
  'ar_panorama',
  'hotspots',
  'photo',
  'quiz',
  'estimate',
  'onsite_code',
  'sequence',
];

export function modulePreset<T extends ModuleType>(type: T, presetId?: string): ModulePreset<T> {
  const presets = MODULE_META[type].presets as ModulePreset<T>[];
  return presets.find((p) => p.id === presetId) ?? presets[0];
}

/** Stationsvorlage: vorbelegter Ablauf aus Modulen (Typ + Variante) */
export interface StationTemplate {
  id: string;
  labelKey: string;
  descriptionKey: string;
  modules: { type: ModuleType; preset?: string }[];
}

export const STATION_TEMPLATES: StationTemplate[] = [
  {
    id: 'time_travel',
    labelKey: 'templateTimeTravel',
    descriptionKey: 'templateTimeTravelDesc',
    modules: [{ type: 'story', preset: 'text' }, { type: 'before_after', preset: 'slider' }, { type: 'quiz', preset: 'single' }],
  },
  {
    id: 'ar_look_around',
    labelKey: 'templateArLookAround',
    descriptionKey: 'templateArLookAroundDesc',
    modules: [{ type: 'story', preset: 'georgi' }, { type: 'ar_panorama', preset: 'camera' }],
  },
  {
    id: 'picture_story',
    labelKey: 'templatePictureStory',
    descriptionKey: 'templatePictureStoryDesc',
    modules: [{ type: 'slideshow' }, { type: 'quiz', preset: 'single' }],
  },
  {
    id: 'listening',
    labelKey: 'templateListening',
    descriptionKey: 'templateListeningDesc',
    modules: [{ type: 'audio' }, { type: 'timeline' }],
  },
  {
    id: 'riddle',
    labelKey: 'templateRiddle',
    descriptionKey: 'templateRiddleDesc',
    modules: [{ type: 'story', preset: 'georgi' }, { type: 'onsite_code', preset: 'number' }, { type: 'estimate', preset: 'year' }],
  },
  {
    id: 'discover',
    labelKey: 'templateDiscover',
    descriptionKey: 'templateDiscoverDesc',
    modules: [{ type: 'hotspots' }, { type: 'quiz', preset: 'true_false' }],
  },
];

export function modulesFromTemplate(template: StationTemplate): DraftModule[] {
  return template.modules.map(({ type, preset }) => modulePreset(type, preset).create() as DraftModule);
}
