import type { ComponentType } from 'react';
import type { ModuleType } from '../types';
import type { ModulePlayerProps } from './ui';
import { StoryPlayer } from './modules/StoryPlayer';
import { SlideshowPlayer } from './modules/SlideshowPlayer';
import { BeforeAfterPlayer } from './modules/BeforeAfterPlayer';
import { QuizPlayer } from './modules/QuizPlayer';
import { EstimatePlayer } from './modules/EstimatePlayer';
import { TimelinePlayer } from './modules/TimelinePlayer';
import { HotspotsPlayer } from './modules/HotspotsPlayer';
import { OnsiteCodePlayer } from './modules/OnsiteCodePlayer';
import { AudioPlayer } from './modules/AudioPlayer';
import { SequencePlayer } from './modules/SequencePlayer';
import { PhotoPlayer } from './modules/PhotoPlayer';
import { ArDiscoverPlayer } from './modules/ArDiscoverLazy';

/** Modultypen, die der Player selbst abspielt (ar_panorama behandelt die Bühne separat) */
export type PlayableModuleType = Exclude<ModuleType, 'ar_panorama'>;

export const MODULE_PLAYERS: { [T in PlayableModuleType]: ComponentType<ModulePlayerProps<T>> } = {
  story: StoryPlayer,
  slideshow: SlideshowPlayer,
  before_after: BeforeAfterPlayer,
  quiz: QuizPlayer,
  estimate: EstimatePlayer,
  timeline: TimelinePlayer,
  hotspots: HotspotsPlayer,
  onsite_code: OnsiteCodePlayer,
  audio: AudioPlayer,
  sequence: SequencePlayer,
  photo: PhotoPlayer,
  ar_discover: ArDiscoverPlayer,
};
