import type { DraftModuleOfType } from '../meta';
import { PassThresholdField } from './PassThresholdField';
import { QuizQuestionsEditor } from './QuizQuestionsEditor';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { countLabel, validateQuestions, type Translate } from './validation';

export const MAX_QUIZ_QUESTIONS = 10;

function QuizEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'quiz'>) {
  return (
    <div className="space-y-5">
      <QuizQuestionsEditor
        questions={module.questions}
        onChange={(update) =>
          onChange((prev) => {
            const questions = update(prev.questions);
            // Die Bestehensgrenze darf die Fragenzahl nie übersteigen (z. B. nach dem Löschen einer Frage)
            const threshold = prev.pass_threshold;
            if (threshold == null || threshold <= questions.length) return { ...prev, questions };
            return { ...prev, questions, pass_threshold: questions.length > 0 ? questions.length : null };
          })
        }
        lang={lang}
        errors={errors}
        errorPrefix="questions"
        idPrefix={`${module.id}-quiz`}
        prepareMedia={prepareMedia}
        withExplanation
        withAudio
        max={MAX_QUIZ_QUESTIONS}
      />

      <PassThresholdField
        value={module.pass_threshold}
        onChange={(pass_threshold) => onChange((prev) => ({ ...prev, pass_threshold }))}
        max={module.questions.length}
        kind="count"
        error={errors.pass_threshold}
      />
    </div>
  );
}

function validate(module: DraftModuleOfType<'quiz'>, t: Translate): ModuleErrors {
  const errors = validateQuestions(module.questions, t, 'questions');
  if (module.pass_threshold != null && module.pass_threshold > module.questions.length) errors.pass_threshold = t('passThresholdTooHigh');
  return errors;
}

function summary(module: DraftModuleOfType<'quiz'>, t: Translate): string {
  const questions = countLabel(t, 'moduleSummaryQuestions', module.questions.length);
  return module.pass_threshold != null
    ? `${questions} · ${t('passThresholdSummary', { n: module.pass_threshold, max: module.questions.length })}`
    : questions;
}

export const quizEditor: ModuleEditorDefinition<'quiz'> = { Editor: QuizEditor, validate, summary };
