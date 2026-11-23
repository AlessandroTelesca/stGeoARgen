import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftModuleOfType } from '../meta';
import { pickLang } from '../types';
import { LocalizedInput, LocalizedTextarea, NumberField } from './fields';
import { PassThresholdField } from './PassThresholdField';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { formatNumber, isBlank, type Translate } from './validation';

type EstimateModule = DraftModuleOfType<'estimate'>;

const finite = (n: number) => Number.isFinite(n);
const MAX_STEPS = 10000;
/** Betragsgrenze der Serverprüfung (station_modules_lib.php: stationModuleNumber) */
const MAX_ABS = 1e12;

/** Gerenderte Skala: Bereich, richtige Antwort als Marker, Toleranzband – live bei Eingabe */
function EstimateScale({ module, lang }: { module: EstimateModule; lang: 'de' | 'en' }) {
  const { t } = useLanguage();
  const { min, max, answer, tolerance } = module;
  if (!finite(min) || !finite(max) || max <= min || !finite(answer)) return null;

  const unit = pickLang(lang, module.unit_de, module.unit_en)?.trim() ?? '';
  const unitSuffix = unit ? ` ${unit}` : '';
  const pct = (value: number) => Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const tol = finite(tolerance) && tolerance > 0 ? tolerance : 0;
  const bandStart = pct(answer - tol);
  const bandEnd = pct(answer + tol);
  const markerAt = pct(answer);

  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-muted px-5 pb-4 pt-10">
        <div className="relative h-3 rounded-full bg-card shadow-xs" role="img" aria-label={t('moduleEditorEstimatePreview', { min: formatNumber(min), max: formatNumber(max), answer: formatNumber(answer), tolerance: formatNumber(tol) })}>
          {tol > 0 && (
            <span
              className="absolute inset-y-0 rounded-full bg-primary/30"
              style={{ left: `${bandStart}%`, width: `${Math.max(bandEnd - bandStart, 1)}%` }}
            />
          )}
          <span className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-md ring-2 ring-white" style={{ left: `${markerAt}%` }} />
          <span
            className="absolute -top-9 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold tabular-nums text-white"
            style={{ left: `${markerAt}%` }}
          >
            {formatNumber(answer)}{unitSuffix}
          </span>
        </div>
        <div className="mt-3 flex justify-between text-xs font-semibold tabular-nums text-muted-foreground">
          <span>{formatNumber(min)}{unitSuffix}</span>
          <span>{formatNumber(max)}{unitSuffix}</span>
        </div>
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">
        {t('moduleEditorEstimatePreview', { min: formatNumber(min), max: formatNumber(max), answer: formatNumber(answer), tolerance: formatNumber(tol) })}
      </p>
    </div>
  );
}

function EstimateEditor({ module, onChange, lang, errors }: ModuleEditorProps<'estimate'>) {
  const { t } = useLanguage();
  const id = module.id;
  const setNumber = (key: 'min' | 'max' | 'step' | 'answer' | 'tolerance') => (value: number | null) =>
    onChange((prev) => ({ ...prev, [key]: value ?? NaN }));

  return (
    <div className="space-y-5">
      <LocalizedTextarea
        id={`${id}-question`}
        rows={2}
        label={t('moduleEditorEstimateQuestion')}
        lang={lang}
        required
        de={module.question_de}
        en={module.question_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, question_de: de, question_en: en }))}
        maxLength={255}
        placeholder={t('moduleEditorEstimateQuestionPlaceholder')}
        error={errors.question_de}
      />

      <EstimateScale module={module} lang={lang} />

      <div className="grid grid-cols-2 gap-3">
        <NumberField id={`${id}-min`} label={t('moduleEditorEstimateMin')} value={module.min} onChange={setNumber('min')} error={errors.min} />
        <NumberField id={`${id}-max`} label={t('moduleEditorEstimateMax')} value={module.max} onChange={setNumber('max')} error={errors.max} />
        <NumberField id={`${id}-answer`} label={t('moduleEditorEstimateAnswer')} value={module.answer} onChange={setNumber('answer')} error={errors.answer} />
        <NumberField
          id={`${id}-tolerance`}
          label={t('moduleEditorEstimateTolerance')}
          value={module.tolerance}
          onChange={setNumber('tolerance')}
          error={errors.tolerance}
        />
        <NumberField id={`${id}-step`} label={t('moduleEditorEstimateStep')} value={module.step} onChange={setNumber('step')} error={errors.step} />
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">{t('moduleEditorEstimateToleranceHint')}</p>

      <LocalizedInput
        id={`${id}-unit`}
        label={t('moduleEditorEstimateUnit')}
        lang={lang}
        de={module.unit_de}
        en={module.unit_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, unit_de: de, unit_en: en }))}
        maxLength={20}
        placeholder={t('moduleEditorEstimateUnitPlaceholder')}
        error={errors.unit_de}
      />

      <LocalizedTextarea
        id={`${id}-explanation`}
        label={t('moduleEditorExplanation')}
        lang={lang}
        de={module.explanation_de}
        en={module.explanation_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, explanation_de: de, explanation_en: en }))}
        maxLength={1000}
        rows={3}
        placeholder={t('moduleEditorExplanationPlaceholder')}
        error={errors.explanation_de}
      />

      <PassThresholdField
        value={module.pass_threshold}
        onChange={(pass_threshold) => onChange((prev) => ({ ...prev, pass_threshold }))}
        max={1}
        kind="solve"
      />
    </div>
  );
}

function validate(module: EstimateModule, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (isBlank(module.question_de)) errors.question_de = t('moduleErrorRequired');
  for (const key of ['min', 'max', 'step', 'answer', 'tolerance'] as const) {
    if (!finite(module[key]) || Math.abs(module[key]) > MAX_ABS) errors[key] = t('moduleErrorNumber');
  }
  if (finite(module.min) && finite(module.max) && module.max <= module.min) errors.max = t('moduleErrorMaxAboveMin');
  if (finite(module.step)) {
    if (module.step <= 0) errors.step = t('moduleErrorStepPositive');
    else if (finite(module.min) && finite(module.max) && (module.max - module.min) / module.step > MAX_STEPS) {
      errors.step = t('moduleErrorStepTooSmall', { max: MAX_STEPS });
    }
  }
  if (finite(module.answer) && finite(module.min) && finite(module.max) && (module.answer < module.min || module.answer > module.max)) {
    errors.answer = t('moduleErrorAnswerRange');
  }
  if (finite(module.tolerance) && module.tolerance < 0) errors.tolerance = t('moduleErrorToleranceNegative');
  return errors;
}

function summary(module: EstimateModule, t: Translate): string {
  const unit = module.unit_de?.trim();
  return t('moduleSummaryEstimate', { answer: `${formatNumber(module.answer)}${unit ? ` ${unit}` : ''}` });
}

export const estimateEditor: ModuleEditorDefinition<'estimate'> = { Editor: EstimateEditor, validate, summary };
