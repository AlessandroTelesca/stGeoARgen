import { useState } from 'react';
import { Check, Music, Plus, X } from 'lucide-react';
import { FieldError, type ImageItem } from '../../components/StationAdminPanel/adminFormParts';
import { Input } from '../../components/ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import { emptyQuestion, type DraftMedia } from '../meta';
import type { MediaKind, QuizQuestion } from '../types';
import { AddButton, ListItemControls, LocalizedInput, LocalizedTextarea, MediaField, Segmented, moveItem } from './fields';
import type { ModuleErrors } from './types';

type Question = QuizQuestion<DraftMedia>;

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const TRUE_FALSE_DE = ['Wahr', 'Falsch'];
const TRUE_FALSE_EN = ['True', 'False'];

/** Wahr/Falsch-Frage: genau die beiden festen Antworten */
export function isTrueFalse(q: Question): boolean {
  return q.options_de.length === 2 && q.options_de[0] === TRUE_FALSE_DE[0] && q.options_de[1] === TRUE_FALSE_DE[1];
}

interface QuizQuestionsEditorProps {
  questions: Question[];
  onChange: (update: (prev: Question[]) => Question[]) => void;
  lang: 'de' | 'en';
  errors: ModuleErrors;
  /** Pfad der Liste in `errors`, z. B. "questions" (→ "questions.0") */
  errorPrefix: string;
  /** Vorsatz für Feld-IDs, eindeutig pro Modul */
  idPrefix: string;
  prepareMedia: (file: File, kind: MediaKind) => Promise<ImageItem | null>;
  /** Erklärung nach der richtigen Antwort (nur Modul „Quiz“) */
  withExplanation: boolean;
  /** Ton als Frage (nur Modul „Quiz“, nicht im AR-Rundumblick) */
  withAudio?: boolean;
  max: number;
}

/** Optionaler Ton einer Frage: erst ein dezenter Knopf, mit gesetztem Ton das offene Audiofeld */
function QuestionAudioField({ value, onChange, prepareMedia }: {
  value: DraftMedia;
  onChange: (audio: DraftMedia) => void;
  prepareMedia: (file: File, kind: MediaKind) => Promise<ImageItem | null>;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!open && !value) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark"
      >
        <Music className="h-4 w-4" />
        {t('moduleEditorAddQuestionSound')}
      </button>
    );
  }
  return (
    <MediaField
      label={t('moduleEditorQuestionSound')}
      kind="audio"
      optional
      value={value}
      onChange={onChange}
      prepareMedia={prepareMedia}
    />
  );
}

/**
 * Quizfragen: je Frage optionaler Ton (nur Quiz), optionales Bild, Frage, Antworten als Karten (richtige grün markiert) oder
 * zwei große Wahr/Falsch-Kacheln. 2–6 Antworten, Englisch entweder komplett oder gar nicht.
 */
export function QuizQuestionsEditor({ questions, onChange, lang, errors, errorPrefix, idPrefix, prepareMedia, withExplanation, withAudio = false, max }: QuizQuestionsEditorProps) {
  const { t } = useLanguage();
  const isEn = lang === 'en';

  const patch = (index: number, update: (q: Question) => Question) =>
    onChange((prev) => prev.map((q, i) => (i === index ? update(q) : q)));

  const setOption = (qIndex: number, oIndex: number, value: string) =>
    patch(qIndex, (q) => {
      if (!isEn) return { ...q, options_de: q.options_de.map((o, i) => (i === oIndex ? value : o)) };
      const next = (q.options_en ?? q.options_de.map(() => '')).map((o, i) => (i === oIndex ? value : o));
      return { ...q, options_en: next.every((o) => !o.trim()) ? null : next };
    });

  const addOption = (qIndex: number) =>
    patch(qIndex, (q) => ({
      ...q,
      options_de: [...q.options_de, ''],
      options_en: q.options_en ? [...q.options_en, ''] : null,
    }));

  const removeOption = (qIndex: number, oIndex: number) =>
    patch(qIndex, (q) => {
      if (q.options_de.length <= MIN_OPTIONS) return q;
      const correct = q.correct_answer === oIndex ? 0 : q.correct_answer > oIndex ? q.correct_answer - 1 : q.correct_answer;
      return {
        ...q,
        options_de: q.options_de.filter((_, i) => i !== oIndex),
        options_en: q.options_en ? q.options_en.filter((_, i) => i !== oIndex) : null,
        correct_answer: correct,
      };
    });

  const setKind = (qIndex: number, kind: 'choice' | 'true_false') =>
    patch(qIndex, (q) => {
      if (kind === 'true_false') {
        return isTrueFalse(q) ? q : { ...q, options_de: [...TRUE_FALSE_DE], options_en: [...TRUE_FALSE_EN], correct_answer: 0 };
      }
      return isTrueFalse(q) ? { ...q, options_de: ['', ''], options_en: null, correct_answer: 0 } : q;
    });

  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {questions.map((q, qIndex) => {
          const path = `${errorPrefix}.${qIndex}`;
          const error = errors[path];
          const errorEn = errors[`${path}.options_en`];
          const trueFalse = isTrueFalse(q);
          const questionLabel = t('moduleEditorQuestionLabel', { n: qIndex + 1 });
          const optionText = (oIndex: number) => (isEn ? (q.options_en?.[oIndex] ?? '') : q.options_de[oIndex]);

          return (
            <li key={qIndex} className={`space-y-4 rounded-2xl border p-3 ${error || errorEn ? 'border-destructive' : 'border-border'}`}>
              <div className="flex items-center gap-1">
                <span className="mr-auto font-bold tabular-nums">{questionLabel}</span>
                <ListItemControls
                  itemLabel={questionLabel}
                  index={qIndex}
                  count={questions.length}
                  onMove={(direction) => onChange((prev) => moveItem(prev, qIndex, direction))}
                  onRemove={() => onChange((prev) => prev.filter((_, i) => i !== qIndex))}
                  removeDisabled={questions.length <= 1}
                />
              </div>

              {withAudio && (
                <QuestionAudioField
                  value={q.audio ?? null}
                  onChange={(audio) => patch(qIndex, (prev) => ({ ...prev, audio }))}
                  prepareMedia={prepareMedia}
                />
              )}

              <MediaField
                label={t('moduleEditorQuestionImage')}
                kind="image"
                optional
                aspect="aspect-[16/9]"
                value={q.image}
                onChange={(image) => patch(qIndex, (prev) => ({ ...prev, image }))}
                prepareMedia={prepareMedia}
              />

              <LocalizedInput
                id={`${idPrefix}-q${qIndex}-question`}
                label={t('stationEditorQuizQuestion')}
                lang={lang}
                required
                de={q.question_de}
                en={q.question_en}
                onChange={(de, en) => patch(qIndex, (prev) => ({ ...prev, question_de: de, question_en: en }))}
                maxLength={255}
                error={error && !q.question_de.trim() ? t('moduleErrorRequired') : undefined}
              />

              <Segmented
                label={t('moduleEditorQuestionKind')}
                value={trueFalse ? 'true_false' : 'choice'}
                options={[
                  { value: 'choice', label: t('moduleEditorKindChoice') },
                  { value: 'true_false', label: t('moduleEditorKindTrueFalse') },
                ]}
                onChange={(kind) => setKind(qIndex, kind)}
              />

              <fieldset>
                <legend className="mb-2 block text-sm font-bold">
                  {t('stationEditorQuizOptions')}
                  {isEn && !trueFalse && ` (${t('stationEditorOptional')})`}
                </legend>

                {trueFalse ? (
                  <div role="radiogroup" aria-label={t('stationEditorQuizOptions')} className="grid grid-cols-2 gap-3">
                    {[0, 1].map((oIndex) => {
                      const correct = q.correct_answer === oIndex;
                      const Icon = oIndex === 0 ? Check : X;
                      return (
                        <button
                          key={oIndex}
                          type="button"
                          role="radio"
                          aria-checked={correct}
                          onClick={() => patch(qIndex, (prev) => ({ ...prev, correct_answer: oIndex }))}
                          className={`relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-base font-bold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-primary/15 ${correct ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-card text-foreground hover:border-primary/40'}`}
                        >
                          <Icon className="h-6 w-6" aria-hidden="true" />
                          {(isEn ? TRUE_FALSE_EN : TRUE_FALSE_DE)[oIndex]}
                          {correct && <span className="text-xs font-semibold">{t('moduleEditorCorrectBadge')}</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {q.options_de.map((optionDe, oIndex) => {
                      const correct = q.correct_answer === oIndex;
                      const missing = !!error && !isEn && !optionDe.trim();
                      return (
                        <div
                          key={oIndex}
                          className={`flex items-center gap-1.5 rounded-2xl border-2 p-1.5 transition-colors ${missing ? 'border-destructive bg-card' : correct ? 'border-primary bg-primary-soft' : 'border-border bg-card'}`}
                        >
                          <button
                            type="button"
                            role="radio"
                            aria-checked={correct}
                            aria-label={t('stationEditorQuizMarkCorrect', { n: oIndex + 1 })}
                            onClick={() => patch(qIndex, (prev) => ({ ...prev, correct_answer: oIndex }))}
                            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums transition-colors ${correct ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
                          >
                            {correct ? <Check className="h-5 w-5" /> : oIndex + 1}
                          </button>
                          <Input
                            value={optionText(oIndex)}
                            onChange={(e) => setOption(qIndex, oIndex, e.target.value)}
                            placeholder={isEn ? optionDe : t('stationEditorQuizOptionPlaceholder', { n: oIndex + 1 })}
                            aria-label={t('stationEditorQuizOptionPlaceholder', { n: oIndex + 1 })}
                            aria-invalid={missing}
                            className="h-11 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-2 shadow-none"
                          />
                          {q.options_de.length > MIN_OPTIONS && (
                            <button
                              type="button"
                              onClick={() => removeOption(qIndex, oIndex)}
                              aria-label={t('stationEditorQuizRemoveOption')}
                              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {trueFalse ? t('moduleEditorTrueFalseHint') : t('stationEditorQuizCorrectHint')}
                </p>
              </fieldset>

              {!trueFalse && q.options_de.length < MAX_OPTIONS && (
                <button
                  type="button"
                  onClick={() => addOption(qIndex)}
                  className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark"
                >
                  <Plus className="h-4 w-4" />
                  {t('stationEditorQuizAddOption')}
                </button>
              )}

              {withExplanation && (
                <LocalizedTextarea
                  id={`${idPrefix}-q${qIndex}-explanation`}
                  label={t('moduleEditorExplanation')}
                  lang={lang}
                  de={q.explanation_de}
                  en={q.explanation_en}
                  onChange={(de, en) => patch(qIndex, (prev) => ({ ...prev, explanation_de: de, explanation_en: en }))}
                  maxLength={1000}
                  rows={3}
                  placeholder={t('moduleEditorExplanationPlaceholder')}
                />
              )}

              <FieldError message={error} />
              <FieldError message={errorEn} />
            </li>
          );
        })}
      </ol>

      {questions.length < max && (
        <AddButton
          label={t('moduleEditorAddQuestion')}
          count={questions.length}
          max={max}
          onClick={() => onChange((prev) => [...prev, emptyQuestion()])}
        />
      )}
      <FieldError message={errors[errorPrefix]} />
    </div>
  );
}
