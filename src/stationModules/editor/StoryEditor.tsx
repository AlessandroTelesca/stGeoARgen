import { Quote } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { FieldLabel } from '../../components/AuthShell';
import { FieldError, inputClass } from '../../components/StationAdminPanel/adminFormParts';
import { useLanguage } from '../../contexts/LanguageContext';
import { asset } from '../../lib/asset';
import type { DraftModuleOfType } from '../meta';
import { pickLang } from '../types';
import { LocalizedTextarea, MediaField, OptionCards, StagePreview } from './fields';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { isBlank, type Translate } from './validation';

type Style = DraftModuleOfType<'story'>['style'];
const STYLES: Style[] = ['text', 'georgi', 'quote'];

/** Mini-Skizzen der drei Stile */
function StyleSketch({ style }: { style: Style }) {
  const line = 'block h-1.5 rounded-full bg-muted-foreground/35';
  if (style === 'georgi') {
    return (
      <span className="flex h-full items-start gap-1.5 p-2">
        <span className="h-6 w-6 flex-shrink-0 rounded-full bg-primary" />
        <span className="flex flex-1 flex-col gap-1 rounded-lg rounded-tl-sm bg-card p-1.5">
          <span className={`${line} w-full`} />
          <span className={`${line} w-3/4`} />
        </span>
      </span>
    );
  }
  if (style === 'quote') {
    return (
      <span className="flex h-full flex-col justify-center gap-1.5 p-2.5">
        <Quote className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className={`${line} w-full`} />
        <span className={`${line} w-2/3`} />
      </span>
    );
  }
  return (
    <span className="flex h-full flex-col justify-center gap-1.5 p-2.5">
      <span className={`${line} w-full`} />
      <span className={`${line} w-full`} />
      <span className={`${line} w-4/5`} />
      <span className={`${line} w-1/2`} />
    </span>
  );
}

function PreviewText({ text, large }: { text: string | null; large?: boolean }) {
  const { t } = useLanguage();
  if (isBlank(text)) return <p className="text-sm text-white/50">{t('moduleEditorStoryTextEmpty')}</p>;
  return (
    <p className={`line-clamp-6 whitespace-pre-line break-words ${large ? 'text-[17px] font-semibold leading-snug text-white' : 'text-[15px] leading-relaxed text-white/90'}`}>
      {text}
    </p>
  );
}

function StoryEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'story'>) {
  const { t } = useLanguage();
  const id = module.id;
  const isQuote = module.style === 'quote';
  const text = pickLang(lang, module.text_de, module.text_en);

  const setStyle = (style: Style) =>
    onChange((prev) => ({ ...prev, style, quote_source: style === 'quote' ? (prev.quote_source ?? '') : prev.quote_source }));

  return (
    <div className="space-y-5">
      <OptionCards
        label={t('moduleEditorStoryStyle')}
        value={module.style}
        onChange={setStyle}
        options={STYLES.map((style) => ({
          value: style,
          label: t(`moduleEditorStoryStyle_${style}`),
          visual: <StyleSketch style={style} />,
        }))}
      />

      <LocalizedTextarea
        id={`${id}-text`}
        label={t('moduleEditorStoryText')}
        lang={lang}
        required
        de={module.text_de}
        en={module.text_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, text_de: de, text_en: en }))}
        maxLength={5000}
        rows={8}
        placeholder={t('moduleEditorStoryTextPlaceholder')}
        error={errors.text_de}
      />

      {isQuote && (
        <div>
          <FieldLabel htmlFor={`${id}-quote-source`}>{t('moduleEditorQuoteSource')} ({t('stationEditorOptional')})</FieldLabel>
          <Input
            id={`${id}-quote-source`}
            value={module.quote_source ?? ''}
            onChange={(e) => onChange((prev) => ({ ...prev, quote_source: e.target.value }))}
            placeholder={t('moduleEditorQuoteSourcePlaceholder')}
            maxLength={150}
            className={inputClass()}
          />
          <FieldError message={errors.quote_source} />
        </div>
      )}

      <MediaField
        label={t('moduleEditorStoryImage')}
        kind="image"
        optional
        aspect="aspect-[16/9]"
        value={module.image}
        onChange={(image) => onChange((prev) => ({ ...prev, image }))}
        prepareMedia={prepareMedia}
        error={errors.image}
      />

      <StagePreview title={t('moduleEditorPreview')}>
        {module.style === 'georgi' ? (
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary shadow-lg">
              <img src={asset('/Logo.svg')} alt="" className="h-7 w-7 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <div className="min-w-0 flex-1 rounded-[20px] rounded-tl-md border border-white/[0.14] bg-white/[0.08] p-4">
              <PreviewText text={text} />
            </div>
          </div>
        ) : (
          <>
            {module.image && <img src={module.image.url} alt="" className="mb-4 aspect-[16/9] w-full rounded-[20px] object-cover" />}
            {isQuote ? (
              <>
                <Quote className="mb-3 h-8 w-8 text-primary-light" aria-hidden="true" />
                <PreviewText text={text} large />
                {module.quote_source && <p className="mt-3 text-sm text-white/70">— {module.quote_source}</p>}
              </>
            ) : (
              <PreviewText text={text} />
            )}
          </>
        )}
      </StagePreview>
    </div>
  );
}

function validate(module: DraftModuleOfType<'story'>, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (isBlank(module.text_de)) errors.text_de = t('moduleErrorRequired');
  return errors;
}

function summary(module: DraftModuleOfType<'story'>, t: Translate): string {
  return t(`moduleEditorStoryStyle_${module.style}`);
}

export const storyEditor: ModuleEditorDefinition<'story'> = { Editor: StoryEditor, validate, summary };
