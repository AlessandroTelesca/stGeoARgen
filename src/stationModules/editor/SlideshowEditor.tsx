import type { DraftModuleOfType } from '../meta';
import { SlidesEditor } from './SlidesEditor';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { countLabel, validateSlides, type Translate } from './validation';

export const MAX_SLIDESHOW_SLIDES = 10;

function SlideshowEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'slideshow'>) {
  return (
    <SlidesEditor
      slides={module.slides}
      onChange={(update) => onChange((prev) => ({ ...prev, slides: update(prev.slides) }))}
      lang={lang}
      max={MAX_SLIDESHOW_SLIDES}
      errors={errors}
      errorPrefix="slides"
      idPrefix={`${module.id}-slide`}
      prepareMedia={prepareMedia}
    />
  );
}

function validate(module: DraftModuleOfType<'slideshow'>, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (module.slides.length < 1) errors.slides = t('moduleErrorSlidesMin');
  return { ...errors, ...validateSlides(module.slides, t, 'slides') };
}

function summary(module: DraftModuleOfType<'slideshow'>, t: Translate): string {
  return countLabel(t, 'moduleSummaryImages', module.slides.length);
}

export const slideshowEditor: ModuleEditorDefinition<'slideshow'> = { Editor: SlideshowEditor, validate, summary };
