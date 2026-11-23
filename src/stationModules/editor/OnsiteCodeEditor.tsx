import { useEffect, useState } from 'react';
import { Hash, Plus, Type, X } from 'lucide-react';
import { FieldLabel } from '../../components/AuthShell';
import { FieldError, inputClass } from '../../components/StationAdminPanel/adminFormParts';
import { Input } from '../../components/ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DraftModuleOfType } from '../meta';
import { LocalizedTextarea, MediaField, OptionCards } from './fields';
import { PassThresholdField } from './PassThresholdField';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { isBlank, type Translate } from './validation';

const MAX_ANSWERS = 5;
type InputKind = DraftModuleOfType<'onsite_code'>['input'];
const INPUTS: InputKind[] = ['number', 'text'];

const filled = (answers: string[]) => answers.filter((a) => !isBlank(a));

function OnsiteCodeEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'onsite_code'>) {
  const { t } = useLanguage();
  const id = module.id;
  const [draft, setDraft] = useState('');
  const answers = filled(module.answers);
  const answersError = errors.answers;

  // Leere Platzhalter-Antworten aus der Vorlage entfernen (angezeigt werden nur ausgefüllte)
  useEffect(() => {
    if (module.answers.some(isBlank)) onChange((prev) => ({ ...prev, answers: filled(prev.answers) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addDraft = () => {
    const value = draft.trim();
    if (!value) return;
    setDraft('');
    onChange((prev) => {
      const current = filled(prev.answers);
      if (current.length >= MAX_ANSWERS || current.includes(value)) return { ...prev, answers: current };
      return { ...prev, answers: [...current, value] };
    });
  };

  return (
    <div className="space-y-5">
      <LocalizedTextarea
        id={`${id}-task`}
        label={t('moduleEditorTask')}
        lang={lang}
        required
        de={module.task_de}
        en={module.task_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, task_de: de, task_en: en }))}
        maxLength={500}
        rows={3}
        placeholder={t('moduleEditorTaskPlaceholder')}
        error={errors.task_de}
      />

      <MediaField
        label={t('moduleEditorImage')}
        kind="image"
        optional
        aspect="aspect-[16/9]"
        value={module.image}
        onChange={(image) => onChange((prev) => ({ ...prev, image }))}
        prepareMedia={prepareMedia}
      />

      <OptionCards
        label={t('moduleEditorInputKind')}
        value={module.input}
        onChange={(input) => onChange((prev) => ({ ...prev, input }))}
        options={INPUTS.map((input) => ({
          value: input,
          label: t(`moduleEditorInput_${input}`),
          visual: (
            <span className="absolute inset-0 flex items-center justify-center gap-2">
              <span className="flex h-9 items-center gap-1.5 rounded-lg bg-card px-3 text-sm font-bold tabular-nums text-foreground shadow-xs">
                {input === 'number' ? <Hash className="h-4 w-4 text-primary" aria-hidden="true" /> : <Type className="h-4 w-4 text-primary" aria-hidden="true" />}
                {input === 'number' ? '1890' : 'Abc'}
              </span>
            </span>
          ),
        }))}
      />

      {/* Akzeptierte Antworten als Chips */}
      <div>
        <FieldLabel htmlFor={`${id}-answer-draft`}>{t('moduleEditorAnswers')}</FieldLabel>
        {answers.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2" aria-label={t('moduleEditorAnswers')}>
            {answers.map((answer) => (
              <li key={answer} className="inline-flex min-h-11 items-center rounded-full border border-primary/25 bg-primary-soft pl-4 pr-1 text-sm font-semibold text-primary">
                <span className="break-all">{answer}</span>
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, answers: filled(prev.answers).filter((a) => a !== answer) }))}
                  aria-label={t('moduleEditorRemoveAnswer', { answer })}
                  className="ml-1 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-primary/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {answers.length < MAX_ANSWERS && (
          <div className="flex gap-2">
            <Input
              id={`${id}-answer-draft`}
              value={draft}
              inputMode={module.input === 'number' ? 'decimal' : 'text'}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDraft();
                }
              }}
              onBlur={addDraft}
              placeholder={t('moduleEditorAnswerPlaceholder')}
              maxLength={100}
              className={inputClass(!!answersError)}
              aria-invalid={!!answersError}
              aria-describedby={`${id}-answer-hint`}
            />
            <button
              type="button"
              onClick={addDraft}
              aria-label={t('moduleEditorAddAnswer')}
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-primary/25 bg-card text-primary transition-colors hover:border-primary"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        )}
        <p id={`${id}-answer-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {t('moduleEditorAnswersHint', { count: answers.length, max: MAX_ANSWERS })}
        </p>
        <FieldError message={answersError} />
      </div>

      <LocalizedTextarea
        id={`${id}-hint`}
        label={t('moduleEditorHint')}
        lang={lang}
        de={module.hint_de}
        en={module.hint_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, hint_de: de, hint_en: en }))}
        maxLength={500}
        rows={2}
        placeholder={t('moduleEditorHintPlaceholder')}
        error={errors.hint_de}
      />

      <LocalizedTextarea
        id={`${id}-solution`}
        label={t('moduleEditorSolution')}
        lang={lang}
        de={module.solution_de}
        en={module.solution_en}
        onChange={(de, en) => onChange((prev) => ({ ...prev, solution_de: de, solution_en: en }))}
        maxLength={1000}
        rows={3}
        placeholder={t('moduleEditorSolutionPlaceholder')}
        error={errors.solution_de}
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

function validate(module: DraftModuleOfType<'onsite_code'>, t: Translate): ModuleErrors {
  const errors: ModuleErrors = {};
  if (isBlank(module.task_de)) errors.task_de = t('moduleErrorRequired');
  const answers = filled(module.answers);
  if (answers.length < 1) errors.answers = t('moduleErrorAnswersMin');
  if (answers.length > MAX_ANSWERS) errors.answers = t('moduleErrorAnswersMax', { max: MAX_ANSWERS });
  return errors;
}

function summary(module: DraftModuleOfType<'onsite_code'>, t: Translate): string {
  const first = filled(module.answers)[0];
  return first ? t('moduleSummaryOnsiteAnswer', { answer: first }) : t(`moduleEditorInput_${module.input}`);
}

export const onsiteCodeEditor: ModuleEditorDefinition<'onsite_code'> = { Editor: OnsiteCodeEditor, validate, summary };
