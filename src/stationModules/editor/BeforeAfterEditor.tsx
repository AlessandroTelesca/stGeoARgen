import { useState, type ReactNode } from 'react';
import { ArrowLeftRight, Camera } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftModuleOfType } from '../meta';
import { pickLang } from '../types';
import { InfoNote, LocalizedInput, LocalizedTextarea, MediaField, OptionCards } from './fields';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { isBlank, type Translate } from './validation';

type Mode = DraftModuleOfType<'before_after'>['mode'];
const MODES: Mode[] = ['slider', 'fade', 'camera'];

/** Mini-Skizzen der drei Modi */
function ModeSketch({ mode }: { mode: Mode }) {
  if (mode === 'slider') {
    return (
      <>
        <span className="absolute inset-0 flex">
          <span className="w-1/2 bg-muted-foreground/30" />
          <span className="w-1/2 bg-primary/30" />
        </span>
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white" />
        <span className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-sm">
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </>
    );
  }
  if (mode === 'fade') {
    return <span className="absolute inset-0 bg-gradient-to-r from-muted-foreground/35 to-primary/35" />;
  }
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-foreground/80">
      <span className="absolute inset-3 rounded-md border border-dashed border-white/50 bg-white/10" />
      <Camera className="relative h-5 w-5 text-white/80" aria-hidden="true" />
    </span>
  );
}

/** Beschriftung am Bildrand (wie im Player) */
function SideBadge({ children, side }: { children: ReactNode; side: 'left' | 'right' }) {
  return (
    <span className={`pointer-events-none absolute top-2 max-w-[45%] truncate rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md ${side === 'left' ? 'left-2' : 'right-2'}`}>
      {children}
    </span>
  );
}

/** Interaktive Mini-Vorschau im gewählten Modus */
function BeforeAfterPreview({ module, lang }: { module: DraftModuleOfType<'before_after'>; lang: 'de' | 'en' }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(50);
  const before = module.before_image;
  const after = module.after_image;
  const camera = module.mode === 'camera';
  if (!before || (!camera && !after)) return null;

  const beforeLabel = pickLang(lang, module.before_label_de, module.before_label_en);
  const afterLabel = pickLang(lang, module.after_label_de, module.after_label_en);
  const rangeLabel = t(`moduleEditorPreviewRange_${module.mode}`);

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold">{t('moduleEditorPreview')}</p>
      <div className="relative aspect-[4/3] select-none overflow-hidden rounded-2xl bg-foreground">
        {module.mode === 'slider' && after && (
          <>
            <img src={after.url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
            <img
              src={before.url}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
            />
            <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-md" style={{ left: `${value}%` }} />
            <span
              className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-md"
              style={{ left: `${value}%` }}
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              aria-label={rangeLabel}
              className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            />
          </>
        )}
        {module.mode === 'fade' && after && (
          <>
            <img src={after.url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
            <img
              src={before.url}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: (100 - value) / 100 }}
            />
          </>
        )}
        {camera && (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="h-12 w-12 text-white/30" aria-hidden="true" />
            </div>
            <img
              src={before.url}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: value / 100 }}
            />
          </>
        )}
        {beforeLabel && <SideBadge side="left">{beforeLabel}</SideBadge>}
        {afterLabel && <SideBadge side="right">{afterLabel}</SideBadge>}
      </div>
      {module.mode !== 'slider' && (
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label={rangeLabel}
          className="h-11 w-full accent-primary"
        />
      )}
    </div>
  );
}

function BeforeAfterEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'before_after'>) {
  const { t } = useLanguage();
  const id = module.id;
  const camera = module.mode === 'camera';

  return (
    <div className="space-y-5">
      <OptionCards
        label={t('moduleEditorMode')}
        value={module.mode}
        onChange={(mode) =>
          onChange((prev) => ({ ...prev, mode, after_image: mode === 'camera' ? null : prev.after_image }))
        }
        options={MODES.map((mode) => ({
          value: mode,
          label: t(`moduleEditorMode_${mode}`),
          visual: <ModeSketch mode={mode} />,
        }))}
      />

      {/* Damals | Heute nebeneinander, wie im Vergleich */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-4 rounded-2xl border border-border p-3">
          <h4 className="font-bold">{t('moduleEditorSideBefore')}</h4>
          <MediaField
            label={t('moduleEditorImage')}
            kind="image"
            value={module.before_image}
            onChange={(image) => onChange((prev) => ({ ...prev, before_image: image }))}
            prepareMedia={prepareMedia}
            error={errors.before_image}
          />
          <LocalizedInput
            id={`${id}-before-label`}
            label={t('moduleEditorSideLabel')}
            lang={lang}
            required
            de={module.before_label_de}
            en={module.before_label_en}
            onChange={(de, en) => onChange((prev) => ({ ...prev, before_label_de: de, before_label_en: en }))}
            maxLength={40}
            placeholder={t('moduleEditorBeforeLabelPlaceholder')}
            error={errors.before_label_de}
          />
        </div>
  
        {/* Heute */}
        <div className="space-y-4 rounded-2xl border border-border p-3">
          <h4 className="font-bold">{t('moduleEditorSideAfter')}</h4>
          {camera ? (
            <InfoNote>{t('moduleEditorAfterCamera')}</InfoNote>
          ) : (
            <MediaField
              label={t('moduleEditorImage')}
              kind="image"
              value={module.after_image}
              onChange={(image) => onChange((prev) => ({ ...prev, after_image: image }))}
              prepareMedia={prepareMedia}
              error={errors.after_image}
            />
          )}
          <LocalizedInput
            id={`${id}-after-label`}
            label={t('moduleEditorSideLabel')}
            lang={lang}
            required
            de={module.after_label_de}
            en={module.after_label_en}
            onChange={(de, en) => onChange((prev) => ({ ...prev, after_label_de: de, after_label_en: en }))}
            maxLength={40}
            placeholder={t('moduleEditorAfterLabelPlaceholder')}
            error={errors.after_label_de}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <BeforeAfterPreview module={module} lang={lang} />
      </div>

      <LocalizedTextarea
        id={`${id}-text`}
        label={t('moduleEditorBeforeAfterText')}
        lang={lang}
        de={module.text_de}
        en={module.text_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, text_de: de, text_en: en }))}
        maxLength={2000}
        rows={4}
        placeholder={t('moduleEditorBeforeAfterTextPlaceholder')}
        error={errors.text_de}
      />
    </div>
  );
}

function validate(module: DraftModuleOfType<'before_after'>, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (!module.before_image) errors.before_image = t('moduleErrorImageRequired');
  if (module.mode !== 'camera' && !module.after_image) errors.after_image = t('moduleErrorImageRequired');
  if (isBlank(module.before_label_de)) errors.before_label_de = t('moduleErrorRequired');
  if (isBlank(module.after_label_de)) errors.after_label_de = t('moduleErrorRequired');
  return errors;
}

function summary(module: DraftModuleOfType<'before_after'>, t: Translate): string {
  return t(`moduleEditorMode_${module.mode}`);
}

export const beforeAfterEditor: ModuleEditorDefinition<'before_after'> = { Editor: BeforeAfterEditor, validate, summary };
