import { useState, type FormEvent } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { pickLang } from '../../types';
import { Feedback, GlassCard, ModuleHeading, ModuleScreen, ModuleText, PrimaryButton, SecondaryButton, StageImage, type ModulePlayerProps } from '../ui';
import { FOCUS_RING, Reveal } from './shared';

type Status = 'open' | 'solved' | 'revealed';

/** Vergleichsform: ohne Rand und Mehrfach-Leerzeichen, klein geschrieben; Zahlen zusätzlich ohne Leerzeichen/Punkte/Kommas */
function normalize(value: string, numeric: boolean): string {
  const base = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return numeric ? base.replace(/[\s.,]/g, '') : base;
}

/** Vor-Ort-Rätsel: Antwort eingeben, bei Fehlversuchen Hinweis und Auflösung */
export function OnsiteCodePlayer({ module, lang, continueLabel, onContinue }: ModulePlayerProps<'onsite_code'>) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<Status>('open');
  const [hintShown, setHintShown] = useState(false);

  const numeric = module.input === 'number';
  const title = pickLang(lang, module.title_de, module.title_en);
  const hint = pickLang(lang, module.hint_de, module.hint_en);
  const solution = pickLang(lang, module.solution_de, module.solution_en);
  const done = status !== 'open';

  const check = () => {
    if (done || value.trim() === '') return;
    const given = normalize(value, numeric);
    if (module.answers.some((a) => normalize(a, numeric) === given)) setStatus('solved');
    else setAttempts((n) => n + 1);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    check();
  };

  return (
    <ModuleScreen
      footer={
        done ? (
          <PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>
        ) : (
          <>
            {attempts >= 1 && hint && (
              <SecondaryButton onClick={() => setHintShown(true)} disabled={hintShown} className={FOCUS_RING}>
                {t('modulePlayerHint')}
              </SecondaryButton>
            )}
            <PrimaryButton onClick={check} disabled={value.trim() === ''}>
              {t('modulePlayerCheck')}
            </PrimaryButton>
          </>
        )
      }
    >
      <ModuleHeading title={title} />
      {module.image && <StageImage src={module.image} className="aspect-[4/3] mb-4" />}
      <GlassCard className="mb-4">
        <ModuleText>{pickLang(lang, module.task_de, module.task_en)}</ModuleText>
      </GlassCard>

      <form onSubmit={onSubmit}>
        <input
          type="text"
          inputMode={numeric ? 'numeric' : 'text'}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          value={value}
          disabled={done}
          onChange={(e) => setValue(e.target.value)}
          aria-label={t('modulePlayerAnswerLabel')}
          placeholder={t('modulePlayerAnswerPlaceholder')}
          className={`w-full h-14 rounded-2xl bg-white/10 border border-white/20 px-4 text-[17px] font-semibold text-white placeholder:text-white/45 disabled:opacity-60 ${FOCUS_RING}`}
        />
      </form>

      <div className="mt-4 space-y-3">
        {status === 'open' && attempts > 0 && (
          <Reveal key={attempts} className="scroll-mb-4">
            <Feedback tone="error" title={t('modulePlayerWrongAnswer')}>
              <span className="tabular-nums">{t('modulePlayerAttempts', { count: attempts })}</span>
            </Feedback>
          </Reveal>
        )}
        {hintShown && hint && status === 'open' && (
          <Reveal className="scroll-mb-4">
            <Feedback tone="info" title={t('modulePlayerHintTitle')}>
              {hint}
            </Feedback>
          </Reveal>
        )}
        {status === 'open' && attempts >= 3 && (
          <button
            type="button"
            onClick={() => setStatus('revealed')}
            className={`min-h-11 px-2 text-[15px] font-semibold text-white/80 underline underline-offset-4 rounded-lg ${FOCUS_RING}`}
          >
            {t('modulePlayerShowSolution')}
          </button>
        )}
        {status === 'solved' && (
          <Reveal className="scroll-mb-4">
            <Feedback tone="success" title={t('modulePlayerSolved')}>
              {solution}
            </Feedback>
          </Reveal>
        )}
        {status === 'revealed' && (
          <Reveal className="scroll-mb-4">
            <Feedback tone="info" title={t('modulePlayerRevealed', { answer: module.answers[0] })}>
              {solution}
            </Feedback>
          </Reveal>
        )}
      </div>
    </ModuleScreen>
  );
}
