import { Camera, CircleHelp, Orbit } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftModuleOfType } from '../meta';
import { EditorSection, MediaField, OptionCards } from './fields';
import { QuizQuestionsEditor } from './QuizQuestionsEditor';
import { SlidesEditor } from './SlidesEditor';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { countLabel, validateQuestions, validateSlides, type Translate } from './validation';

export const MAX_PANORAMA_SLIDES = 9;
export const MAX_PANORAMA_QUESTIONS = 10;
/** Winkelabstand der Plätze rundum (wie PANEL_YAWS_DEG in CustomPanoramaQuizView: 0°, 36°, 72° …) */
const SLOT_STEP_DEG = 36;

type Background = DraftModuleOfType<'ar_panorama'>['background'];
const BACKGROUNDS: Background[] = ['camera', 'panorama'];

/** Draufsicht: Wo hängen Bilder und Quiz rundum? Oben = Blickrichtung beim Start, im Uhrzeigersinn. */
function RingDiagram({ slides }: { slides: DraftModuleOfType<'ar_panorama'>['slides'] }) {
  const { t } = useLanguage();
  const nodes = [...slides.map((slide, i) => ({ kind: 'slide' as const, url: slide.image?.url ?? null, n: i + 1 })), { kind: 'quiz' as const, url: null, n: 0 }];

  return (
    <div className="rounded-2xl bg-muted p-3">
      <div className="relative mx-auto h-56 w-56" role="img" aria-label={t('moduleEditorRingLabel', { count: slides.length })}>
        <span className="absolute inset-[14%] rounded-full border-2 border-dashed border-border-strong" />
        <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card text-muted-foreground shadow-xs">
          <Orbit className="h-5 w-5" aria-hidden="true" />
        </span>
        {nodes.map((node, slot) => {
          const rad = (slot * SLOT_STEP_DEG * Math.PI) / 180;
          const left = 50 + 36 * Math.sin(rad);
          const top = 50 - 36 * Math.cos(rad);
          return (
            <span
              key={slot}
              className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full text-xs font-bold tabular-nums ring-2 ring-white shadow-md ${node.kind === 'quiz' ? 'bg-primary text-white' : 'bg-card text-foreground'}`}
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {node.kind === 'quiz' ? (
                <CircleHelp className="h-5 w-5" aria-hidden="true" />
              ) : (
                <>
                  {node.url && <img src={node.url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  <span className="relative rounded-full bg-black/55 px-1.5 text-white">{node.n}</span>
                </>
              )}
            </span>
          );
        })}
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">{t('moduleEditorRingCaption')}</p>
    </div>
  );
}

function ArPanoramaEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'ar_panorama'>) {
  const { t } = useLanguage();
  const id = module.id;
  const photo = module.background === 'panorama';

  return (
    <div className="space-y-5">
      <OptionCards
        label={t('moduleEditorBackground')}
        value={module.background}
        onChange={(background) => onChange((prev) => ({ ...prev, background }))}
        options={BACKGROUNDS.map((background) => ({
          value: background,
          label: t(`moduleEditorBackground_${background}`),
          visual:
            background === 'camera' ? (
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/80">
                <span className="absolute inset-3 rounded-md border border-dashed border-white/50 bg-white/10" />
                <Camera className="relative h-5 w-5 text-white/80" aria-hidden="true" />
              </span>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-primary/20 via-primary/45 to-primary/20">
                <Orbit className="h-6 w-6 text-primary" aria-hidden="true" />
              </span>
            ),
        }))}
      />

      {photo && (
        <MediaField
          label={t('moduleEditorPanoramaImage')}
          kind="panorama"
          value={module.panorama_image}
          onChange={(panorama_image) => onChange((prev) => ({ ...prev, panorama_image }))}
          prepareMedia={prepareMedia}
          error={errors.panorama_image}
        />
      )}

      <RingDiagram slides={module.slides} />

      <EditorSection title={t('moduleEditorPanoramaSlides')}>
        <SlidesEditor
          slides={module.slides}
          onChange={(update) => onChange((prev) => ({ ...prev, slides: update(prev.slides) }))}
          lang={lang}
          max={MAX_PANORAMA_SLIDES}
          errors={errors}
          errorPrefix="slides"
          idPrefix={`${id}-slide`}
          prepareMedia={prepareMedia}
        />
      </EditorSection>

      <EditorSection title={t('moduleEditorPanoramaQuiz')}>
        <QuizQuestionsEditor
          questions={module.questions}
          onChange={(update) => onChange((prev) => ({ ...prev, questions: update(prev.questions) }))}
          lang={lang}
          errors={errors}
          errorPrefix="questions"
          idPrefix={`${id}-quiz`}
          prepareMedia={prepareMedia}
          withExplanation={false}
          max={MAX_PANORAMA_QUESTIONS}
        />
      </EditorSection>
    </div>
  );
}

function validate(module: DraftModuleOfType<'ar_panorama'>, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (module.background === 'panorama' && !module.panorama_image) errors.panorama_image = t('moduleErrorPanoramaRequired');
  return {
    ...errors,
    ...validateSlides(module.slides, t, 'slides'),
    ...validateQuestions(module.questions, t, 'questions'),
  };
}

function summary(module: DraftModuleOfType<'ar_panorama'>, t: Translate): string {
  const parts = [t(`moduleEditorBackground_${module.background}`)];
  if (module.slides.length > 0) parts.push(countLabel(t, 'moduleSummaryImages', module.slides.length));
  parts.push(countLabel(t, 'moduleSummaryQuestions', module.questions.length));
  return parts.join(' · ');
}

export const arPanoramaEditor: ModuleEditorDefinition<'ar_panorama'> = { Editor: ArPanoramaEditor, validate, summary };
