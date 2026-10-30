import { arPanoramaEditor } from './ArPanoramaEditor';
import { audioEditor } from './AudioEditor';
import { beforeAfterEditor } from './BeforeAfterEditor';
import { estimateEditor } from './EstimateEditor';
import { hotspotsEditor } from './HotspotsEditor';
import { onsiteCodeEditor } from './OnsiteCodeEditor';
import { photoEditor } from './PhotoEditor';
import { quizEditor } from './QuizEditor';
import { sequenceEditor } from './SequenceEditor';
import { slideshowEditor } from './SlideshowEditor';
import { storyEditor } from './StoryEditor';
import { timelineEditor } from './TimelineEditor';
import type { ModuleEditorRegistry } from './types';

/** Editor, Prüfung und Kurzangabe je Modultyp */
export const MODULE_EDITORS: ModuleEditorRegistry = {
  story: storyEditor,
  slideshow: slideshowEditor,
  before_after: beforeAfterEditor,
  ar_panorama: arPanoramaEditor,
  quiz: quizEditor,
  estimate: estimateEditor,
  timeline: timelineEditor,
  hotspots: hotspotsEditor,
  onsite_code: onsiteCodeEditor,
  audio: audioEditor,
  sequence: sequenceEditor,
  photo: photoEditor,
};
