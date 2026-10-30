import { Camera } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftModuleOfType } from '../meta';
import { PHOTO_ASPECT, PhotoFrameOverlay, photoDate } from '../photoFrame';
import { pickLang } from '../types';
import { LocalizedInput, OptionCards, Segmented, StagePreview } from './fields';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { isBlank, type Translate } from './validation';

type Frame = DraftModuleOfType<'photo'>['frame'];
type CameraKind = DraftModuleOfType<'photo'>['camera'];
const FRAMES: Frame[] = ['badge', 'polaroid'];
const CAMERAS: CameraKind[] = ['environment', 'user'];

/** Mini-Skizzen der beiden Rahmen */
function FrameSketch({ frame }: { frame: Frame }) {
  if (frame === 'polaroid') {
    return (
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-11 flex-col items-center gap-1 rounded-sm bg-card p-1 pb-1.5 shadow-xs">
          <span className="block w-full flex-1 rounded-[2px] bg-muted-foreground/30" />
          <span className="block h-1 w-6 rounded-full bg-muted-foreground/45" />
        </span>
      </span>
    );
  }
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <span className="relative h-14 w-11 overflow-hidden rounded-sm bg-muted-foreground/30">
        <span className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-foreground/70 to-transparent" />
        <span className="absolute bottom-1 left-1 h-3.5 w-3.5 rounded-full bg-primary ring-1 ring-white" />
        <span className="absolute bottom-2 left-6 h-1 w-4 rounded-full bg-white/90" />
      </span>
    </span>
  );
}

function PhotoEditor({ module, onChange, lang, errors }: ModuleEditorProps<'photo'>) {
  const { t, language } = useLanguage();
  const id = module.id;
  const caption = pickLang(lang, module.caption_de, module.caption_en) ?? t('modulePhotoCaptionPlaceholder');

  return (
    <div className="space-y-5">
      <LocalizedInput
        id={`${id}-prompt`}
        label={t('modulePhotoPrompt')}
        lang={lang}
        required
        de={module.prompt_de}
        en={module.prompt_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, prompt_de: de, prompt_en: en }))}
        maxLength={255}
        placeholder={t('modulePhotoPromptPlaceholder')}
        error={errors.prompt_de}
      />

      <OptionCards
        label={t('modulePhotoFrame')}
        value={module.frame}
        onChange={(frame) => onChange((prev) => ({ ...prev, frame }))}
        options={FRAMES.map((frame) => ({
          value: frame,
          label: t(`modulePhotoFrame_${frame}`),
          visual: <FrameSketch frame={frame} />,
        }))}
      />

      <Segmented
        label={t('modulePhotoCamera')}
        value={module.camera}
        onChange={(camera) => onChange((prev) => ({ ...prev, camera }))}
        options={CAMERAS.map((camera) => ({ value: camera, label: t(`modulePhotoCamera_${camera}`) }))}
      />

      <LocalizedInput
        id={`${id}-caption`}
        label={t('modulePhotoCaption')}
        lang={lang}
        de={module.caption_de}
        en={module.caption_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, caption_de: de, caption_en: en }))}
        maxLength={60}
        placeholder={t('modulePhotoCaptionPlaceholder')}
        hint={t('modulePhotoCaptionHint')}
        error={errors.caption_de}
      />

      <StagePreview title={t('modulePhotoPreview')} always>
        <div
          className="@container relative mx-auto w-full max-w-[220px] overflow-hidden rounded-[20px] bg-gradient-to-b from-white/25 to-white/10"
          style={{ aspectRatio: String(PHOTO_ASPECT) }}
        >
          <Camera className="absolute left-1/2 top-[38%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
          <PhotoFrameOverlay frame={module.frame} caption={caption} date={photoDate(language)} />
        </div>
        <p className="mt-3 text-center text-sm text-white/75">{pickLang(lang, module.prompt_de, module.prompt_en) || t('modulePhotoPromptPlaceholder')}</p>
      </StagePreview>
    </div>
  );
}

function validate(module: DraftModuleOfType<'photo'>, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (isBlank(module.prompt_de)) errors.prompt_de = t('moduleErrorRequired');
  return errors;
}

function summary(module: DraftModuleOfType<'photo'>, t: Translate): string {
  return `${t(`modulePhotoFrame_${module.frame}`)} · ${t(`modulePhotoCameraShort_${module.camera}`)}`;
}

export const photoEditor: ModuleEditorDefinition<'photo'> = { Editor: PhotoEditor, validate, summary };
