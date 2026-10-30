import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { pickLang } from '../../types';
import { ChoiceButton, Feedback, GlassCard, ModuleHeading, ModuleScreen, PrimaryButton, StageImage, type ChoiceState, type ModulePlayerProps } from '../ui';
import { Reveal } from './shared';

/** Quiz: Fragen nacheinander, falsche Antworten werden markiert, bis die richtige gewählt ist */
export function QuizPlayer({ module, lang, continueLabel, onContinue }: ModulePlayerProps<'quiz'>) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const questions = module.questions;
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const title = pickLang(lang, module.title_de, module.title_en) ?? t('moduleQuiz');
  const options = lang === 'en' && question.options_en && question.options_en.length === question.options_de.length ? question.options_en : question.options_de;
  const explanation = pickLang(lang, question.explanation_de, question.explanation_en);

  // Bei einer neuen Frage wieder nach oben scrollen
  useEffect(() => {
    if (index > 0) topRef.current?.scrollIntoView({ block: 'start' });
  }, [index]);

  const choose = (i: number) => {
    if (solved || wrong.includes(i)) return;
    if (i === question.correct_answer) setSolved(true);
    else setWrong((w) => [...w, i]);
  };

  const next = () => {
    if (isLast) {
      onContinue();
      return;
    }
    setIndex(index + 1);
    setWrong([]);
    setSolved(false);
  };

  const stateOf = (i: number): ChoiceState => {
    if (solved) return i === question.correct_answer ? 'correct' : 'dimmed';
    return wrong.includes(i) ? 'wrong' : 'idle';
  };

  return (
    <ModuleScreen
      footer={
        <PrimaryButton onClick={next} disabled={!solved}>
          {isLast ? continueLabel : t('modulePlayerNextQuestion')}
        </PrimaryButton>
      }
    >
      <div ref={topRef} className="scroll-mt-2" />
      <div className="tabular-nums">
        <ModuleHeading title={title} subtitle={t('modulePlayerQuestionOf', { current: index + 1, total: questions.length })} />
      </div>

      <motion.div
        key={index}
        initial={{ opacity: 0, y: reduce ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {question.image && <StageImage src={question.image} className="aspect-[4/3] mb-4" />}
        <GlassCard className="mb-4">
          <p className="text-[17px] font-bold leading-snug text-white whitespace-pre-line">{pickLang(lang, question.question_de, question.question_en)}</p>
        </GlassCard>

        <div className="space-y-2.5">
          {options.map((option, i) => (
            <ChoiceButton key={i} index={i} state={stateOf(i)} onClick={() => choose(i)}>
              {option}
            </ChoiceButton>
          ))}
        </div>

        {solved ? (
          <Reveal className="mt-4 scroll-mb-4">
            <Feedback tone="success" title={t('modulePlayerCorrectTitle')}>
              {explanation}
            </Feedback>
          </Reveal>
        ) : (
          wrong.length > 0 && (
            <Reveal key={wrong.length} className="mt-4 scroll-mb-4">
              <Feedback tone="error" title={t('modulePlayerWrongTitle')} />
            </Reveal>
          )
        )}
      </motion.div>
    </ModuleScreen>
  );
}
