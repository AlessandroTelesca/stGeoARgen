import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { FieldLabel } from '../AuthShell';
import { Input } from '../ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import { customStationImageUrl, type CustomQuizQuestion } from '../../services/api';
import { inputClass, prepareImage, type ImageItem } from './adminFormParts';

export const MAX_PANORAMA_QUESTIONS = 10;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

/** Eine Quizfrage im Formular (DE Pflicht, EN optional) */
export interface QuizQuestionDraft {
  questionDe: string;
  questionEn: string;
  optionsDe: string[];
  optionsEn: string[];
  correct: number | null;
  /** Optionales Bild, das über der Frage angezeigt wird */
  image: ImageItem | null;
}

export function emptyQuizQuestion(): QuizQuestionDraft {
  return { questionDe: '', questionEn: '', optionsDe: ['', '', ''], optionsEn: ['', '', ''], correct: null, image: null };
}

export function quizQuestionFromApi(q: CustomQuizQuestion): QuizQuestionDraft {
  return {
    questionDe: q.question_de,
    questionEn: q.question_en ?? '',
    optionsDe: q.options_de,
    optionsEn: q.options_en ?? q.options_de.map(() => ''),
    correct: q.correct_answer,
    image: q.image ? { kind: 'existing', filename: q.image, url: customStationImageUrl(q.image) } : null,
  };
}

/** image: vorhandener Dateiname, `new:N` für eine neu hochgeladene Datei oder null */
export function quizQuestionToApi(q: QuizQuestionDraft, image: string | null): CustomQuizQuestion {
  const enFilled = q.optionsEn.some((o) => o.trim());
  return {
    question_de: q.questionDe.trim(),
    question_en: q.questionEn.trim() || null,
    options_de: q.optionsDe.map((o) => o.trim()),
    options_en: enFilled ? q.optionsEn.map((o) => o.trim()) : null,
    correct_answer: q.correct!,
    image,
  };
}

/** Index der ersten unvollständigen Frage samt Fehler-Schlüssel, oder null wenn alles passt. */
export function findQuizQuestionError(questions: QuizQuestionDraft[]): { index: number; key: string } | null {
  for (const [index, q] of questions.entries()) {
    const enFilled = q.optionsEn.filter((o) => o.trim()).length;
    if (!q.questionDe.trim() || q.optionsDe.some((o) => !o.trim())) return { index, key: 'stationEditorErrorQuizDe' };
    if (enFilled > 0 && enFilled < q.optionsEn.length) return { index, key: 'stationEditorErrorQuizEn' };
    if (q.correct === null) return { index, key: 'stationEditorErrorQuizCorrect' };
  }
  return null;
}

interface PanoramaQuizEditorProps {
  questions: QuizQuestionDraft[];
  /** Erhält eine Update-Funktion (auf den aktuellen Stand angewendet – wichtig nach dem asynchronen Bildladen) */
  onChange: (update: (questions: QuizQuestionDraft[]) => QuizQuestionDraft[]) => void;
  language: 'de' | 'en';
  /** Frage mit Fehler (wird markiert) */
  errorIndex?: number;
}

/** Editor für die Quizfragen einer 360°-Station: mehrere Fragen mit je 2–6 Antworten. */
export function PanoramaQuizEditor({ questions, onChange, language, errorIndex }: PanoramaQuizEditorProps) {
  const { t } = useLanguage();
  const isEn = language === 'en';
  const optional = isEn ? ` (${t('stationEditorOptional')})` : '';

  // Objekt-URLs der Vorschaubilder beim Schließen des Formulars freigeben
  const previewUrlsRef = useRef<string[]>([]);
  useEffect(() => () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const handleImageChange = async (index: number, input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error(t('stationEditorImageFormat'));
      return;
    }
    const prepared = await prepareImage(file);
    const url = URL.createObjectURL(prepared);
    previewUrlsRef.current.push(url);
    updateQuestion(index, { image: { kind: 'new', file: prepared, url } });
  };

  const updateQuestion = (index: number, patch: Partial<QuizQuestionDraft>) => {
    onChange((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    onChange((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const q = questions[qIndex];
    if (q.optionsDe.length <= MIN_OPTIONS) return;
    const correct = q.correct === null || q.correct === oIndex ? null : q.correct > oIndex ? q.correct - 1 : q.correct;
    updateQuestion(qIndex, {
      optionsDe: q.optionsDe.filter((_, i) => i !== oIndex),
      optionsEn: q.optionsEn.filter((_, i) => i !== oIndex),
      correct,
    });
  };

  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {questions.map((q, qIndex) => (
          <li
            key={qIndex}
            className={`rounded-2xl border p-3 space-y-3 ${errorIndex === qIndex ? 'border-destructive' : 'border-border'}`}
          >
            <div className="flex items-center gap-1">
              <span className="font-bold tabular-nums mr-auto">{t('stationEditorPanoramaQuestionLabel', { n: qIndex + 1 })}</span>
              <button
                type="button"
                onClick={() => moveQuestion(qIndex, -1)}
                disabled={qIndex === 0}
                aria-label={t('stationEditorPanoramaMoveQuestionUp')}
                className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => moveQuestion(qIndex, 1)}
                disabled={qIndex === questions.length - 1}
                aria-label={t('stationEditorPanoramaMoveQuestionDown')}
                className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange((prev) => prev.filter((_, i) => i !== qIndex))}
                disabled={questions.length <= 1}
                aria-label={t('stationEditorPanoramaRemoveQuestion')}
                className="w-11 h-11 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/8 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Optionales Bild zur Frage */}
            {q.image && (
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[4/3]">
                <img src={q.image.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => updateQuestion(qIndex, { image: null })}
                  aria-label={t('stationEditorPanoramaRemoveQuestionImage')}
                  className="absolute top-2 right-2 w-11 h-11 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <label className="w-full min-h-[44px] bg-card text-primary border-2 border-dashed border-primary/25 hover:border-primary rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer focus-within:ring-4 focus-within:ring-primary/15">
              <ImagePlus className="w-4 h-4" />
              <span>{q.image ? t('stationEditorPanoramaChangeQuestionImage') : t('stationEditorPanoramaAddQuestionImage')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => void handleImageChange(qIndex, e.currentTarget)}
              />
            </label>

            <div>
              <FieldLabel htmlFor={`pq-question-${qIndex}`}>{t('stationEditorQuizQuestion')}{optional}</FieldLabel>
              <Input
                id={`pq-question-${qIndex}`}
                value={isEn ? q.questionEn : q.questionDe}
                onChange={(e) => updateQuestion(qIndex, isEn ? { questionEn: e.target.value } : { questionDe: e.target.value })}
                placeholder={isEn ? q.questionDe : undefined}
                maxLength={255}
                className={inputClass()}
              />
            </div>

            <fieldset>
              <legend className="block text-sm font-bold mb-2">{t('stationEditorQuizOptions')}</legend>
              <div className="space-y-2.5">
                {q.optionsDe.map((optionDe, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={q.correct === oIndex}
                      aria-label={t('stationEditorQuizMarkCorrect', { n: oIndex + 1 })}
                      onClick={() => updateQuestion(qIndex, { correct: oIndex })}
                      className={`w-11 h-11 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${q.correct === oIndex ? 'border-primary bg-primary text-white' : 'border-border-strong bg-card text-muted-foreground hover:border-primary/60'}`}
                    >
                      {oIndex + 1}
                    </button>
                    <Input
                      value={isEn ? q.optionsEn[oIndex] : optionDe}
                      onChange={(e) => {
                        const key = isEn ? 'optionsEn' : 'optionsDe';
                        updateQuestion(qIndex, { [key]: q[key].map((o, i) => (i === oIndex ? e.target.value : o)) });
                      }}
                      placeholder={isEn ? optionDe : t('stationEditorQuizOptionPlaceholder', { n: oIndex + 1 })}
                      aria-label={t('stationEditorQuizOptionPlaceholder', { n: oIndex + 1 })}
                      className={inputClass()}
                    />
                    {q.optionsDe.length > MIN_OPTIONS && (
                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, oIndex)}
                        aria-label={t('stationEditorQuizRemoveOption')}
                        className="w-11 h-11 flex-shrink-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/8 flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('stationEditorQuizCorrectHint')}</p>
            </fieldset>

            {q.optionsDe.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={() => updateQuestion(qIndex, { optionsDe: [...q.optionsDe, ''], optionsEn: [...q.optionsEn, ''] })}
                className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark"
              >
                <Plus className="w-4 h-4" />
                {t('stationEditorQuizAddOption')}
              </button>
            )}
          </li>
        ))}
      </ol>

      {questions.length < MAX_PANORAMA_QUESTIONS && (
        <button
          type="button"
          onClick={() => onChange((prev) => [...prev, emptyQuizQuestion()])}
          className="w-full min-h-[48px] bg-card text-primary border-2 border-primary/25 hover:border-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors pressable"
        >
          <Plus className="w-5 h-5" />
          {t('stationEditorPanoramaAddQuestion')}
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {questions.length} / {MAX_PANORAMA_QUESTIONS}
          </span>
        </button>
      )}
    </div>
  );
}
