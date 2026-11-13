import type { DraftModuleOfType } from '../meta';
import { QuizQuestionsEditor } from './QuizQuestionsEditor';
import type { ModuleEditorDefinition, ModuleEditorProps, ModuleErrors } from './types';
import { countLabel, validateQuestions, type Translate } from './validation';

export const MAX_QUIZ_QUESTIONS = 10;

function QuizEditor({ module, onChange, lang, errors, prepareMedia }: ModuleEditorProps<'quiz'>) {
  return (
    <QuizQuestionsEditor
      questions={module.questions}
      onChange={(update) => onChange((prev) => ({ ...prev, questions: update(prev.questions) }))}
      lang={lang}
      errors={errors}
      errorPrefix="questions"
      idPrefix={`${module.id}-quiz`}
      prepareMedia={prepareMedia}
      withExplanation
      withAudio
      max={MAX_QUIZ_QUESTIONS}
    />
  );
}

function validate(module: DraftModuleOfType<'quiz'>, t: Translate): ModuleErrors {
  return validateQuestions(module.questions, t, 'questions');
}

function summary(module: DraftModuleOfType<'quiz'>, t: Translate): string {
  return countLabel(t, 'moduleSummaryQuestions', module.questions.length);
}

export const quizEditor: ModuleEditorDefinition<'quiz'> = { Editor: QuizEditor, validate, summary };
