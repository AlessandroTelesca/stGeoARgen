import type { DraftMedia } from '../meta';
import type { QuizQuestion, SlideItem } from '../types';
import type { ModuleErrors } from './types';

/** Übersetzungsfunktion wie in ModuleEditorDefinition (Platzhalter `{name}` im Text) */
export type Translate = (key: string, params?: Record<string, string | number>) => string;

export const isBlank = (value: string | null | undefined): boolean => !value || !value.trim();

/** Zählangabe mit Einzahl/Mehrzahl: Schlüssel `${base}One` und `${base}Other`, Platzhalter {count} */
export function countLabel(t: Translate, base: string, count: number): string {
  return t(count === 1 ? `${base}One` : `${base}Other`, { count });
}

/** Zahl für die Anzeige in Meldungen und Kurzangaben (leer/ungültig → Gedankenstrich) */
/** Zahl wie im Player mit Tausenderpunkt (42.000), sonst Strich */
export function formatNumber(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('de-DE', { maximumFractionDigits: 6 }) : '–';
}

/** Pflichtangaben je Bild einer Bildfolge: `${prefix}.N.image`, `${prefix}.N.text_de` */
export function validateSlides(slides: SlideItem<DraftMedia>[], t: Translate, prefix: string): ModuleErrors {
  const errors: ModuleErrors = {};
  slides.forEach((slide, i) => {
    if (!slide.image) errors[`${prefix}.${i}.image`] = t('moduleErrorImageRequired');
    if (isBlank(slide.text_de)) errors[`${prefix}.${i}.text_de`] = t('moduleErrorRequired');
  });
  return errors;
}

/**
 * Prüft Quizfragen: `${prefix}` (Menge), `${prefix}.N` (deutsche Pflichtangaben, richtige Antwort),
 * `${prefix}.N.options_en` (englische Antworten nur ganz oder gar nicht).
 */
export function validateQuestions(questions: QuizQuestion<DraftMedia>[], t: Translate, prefix: string, min = 1): ModuleErrors {
  const errors: ModuleErrors = {};
  if (questions.length < min) errors[prefix] = t('moduleErrorQuestionsMin', { count: min });
  questions.forEach((q, i) => {
    if (isBlank(q.question_de) || q.options_de.some(isBlank)) {
      errors[`${prefix}.${i}`] = t('moduleErrorQuizDe');
    } else if (!Number.isInteger(q.correct_answer) || q.correct_answer < 0 || q.correct_answer >= q.options_de.length) {
      errors[`${prefix}.${i}`] = t('moduleErrorQuizCorrect');
    }
    if (q.options_en) {
      const filled = q.options_en.filter((o) => !isBlank(o)).length;
      if (filled > 0 && filled < q.options_en.length) errors[`${prefix}.${i}.options_en`] = t('moduleErrorQuizEn');
    }
  });
  return errors;
}
