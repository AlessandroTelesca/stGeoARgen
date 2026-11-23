import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { pickLang } from '../../types';
import { Feedback, ModuleHeading, ModuleScreen, PrimaryButton, SecondaryButton, type ModulePlayerProps } from '../ui';
import { FOCUS_RING, Reveal } from './shared';

type Status = 'filling' | 'checked' | 'solved' | 'revealed';

const MAX_ATTEMPTS_BEFORE_SOLUTION = 3;

/** Deterministische Zufallszahlen (mulberry32) aus einem Text */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gemischte Reihenfolge der Einträge (Indizes) – pro Modul immer gleich und nie schon richtig sortiert */
function shuffledOrder(count: number, seed: string): number[] {
  const random = seededRandom(seed);
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (order.every((value, i) => value === i)) order.push(order.shift() as number);
  return order;
}

function Thumb({ src, size }: { src: string; size: string }) {
  return <img src={src} alt="" loading="lazy" className={`${size} flex-shrink-0 rounded-xl bg-white/5 object-cover`} />;
}

/** Reihenfolge: Einträge der Reihe nach antippen (kein Ziehen), prüfen, falsche neu setzen */
export function SequencePlayer({ module, lang, continueLabel, onContinue, onResult }: ModulePlayerProps<'sequence'>) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const count = module.items.length;
  const title = pickLang(lang, module.title_de, module.title_en);
  const task = pickLang(lang, module.task_de, module.task_en);
  const explanation = pickLang(lang, module.explanation_de, module.explanation_en);
  const order = useMemo(() => shuffledOrder(count, module.id), [count, module.id]);

  /** placed[slot] = Index des Eintrags (in richtiger Reihenfolge) auf diesem Platz, null = frei */
  const [placed, setPlaced] = useState<(number | null)[]>(() => Array.from({ length: count }, () => null));
  const [locked, setLocked] = useState<boolean[]>(() => Array.from({ length: count }, () => false));
  const [wrong, setWrong] = useState<boolean[]>(() => Array.from({ length: count }, () => false));
  const [status, setStatus] = useState<Status>('filling');
  const [attempts, setAttempts] = useState(0);

  const textOf = (index: number) => pickLang(lang, module.items[index].text_de, module.items[index].text_en);
  const labelOf = (index: number) => module.items[index].label?.trim() || null;

  const filling = status === 'filling';
  const done = status === 'solved' || status === 'revealed';
  const placedCount = placed.filter((p) => p !== null).length;
  const full = placedCount === count;
  const pool = order.filter((index) => !placed.includes(index));
  const nextFree = placed.indexOf(null);

  const place = (index: number) => {
    if (!filling || nextFree === -1) return;
    setPlaced((prev) => prev.map((p, slot) => (slot === prev.indexOf(null) ? index : p)));
  };

  const take = (slot: number) => {
    if (!filling || locked[slot]) return;
    setPlaced((prev) => prev.map((p, i) => (i === slot ? null : p)));
  };

  const check = () => {
    if (!filling || !full) return;
    const results = placed.map((p, slot) => p === slot);
    setLocked(results);
    setWrong(results.map((ok) => !ok));
    if (results.every(Boolean)) {
      setStatus('solved');
    } else {
      setAttempts((n) => n + 1);
      setStatus('checked');
    }
  };

  const retry = () => {
    setPlaced((prev) => prev.map((p, slot) => (locked[slot] ? p : null)));
    setWrong(Array.from({ length: count }, () => false));
    setStatus('filling');
  };

  const reveal = () => {
    setPlaced(Array.from({ length: count }, (_, i) => i));
    setLocked(Array.from({ length: count }, () => true));
    setWrong(Array.from({ length: count }, () => false));
    setStatus('revealed');
  };

  // Ergebnis einmal pro Durchlauf melden: selbst gelöst = 1, Lösung aufgedeckt = 0
  const reported = useRef(false);
  const finish = () => {
    if (!reported.current) {
      reported.current = true;
      onResult?.({ correct: status === 'solved' ? 1 : 0, total: 1 });
    }
    onContinue();
  };

  const correctCount = locked.filter(Boolean).length;
  const layoutProps = reduce ? {} : { layout: true, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const } };

  const footer = done ? (
    <PrimaryButton onClick={finish}>{continueLabel}</PrimaryButton>
  ) : status === 'checked' ? (
    <>
      {attempts >= MAX_ATTEMPTS_BEFORE_SOLUTION && (
        <SecondaryButton onClick={reveal} className={FOCUS_RING}>
          {t('moduleSeqShowSolution')}
        </SecondaryButton>
      )}
      <PrimaryButton onClick={retry}>{t('moduleSeqRetry')}</PrimaryButton>
    </>
  ) : (
    <PrimaryButton onClick={check} disabled={!full}>
      {t('modulePlayerCheck')}
    </PrimaryButton>
  );

  return (
    <ModuleScreen footer={footer}>
      <ModuleHeading title={title ?? task} subtitle={title ? task : null} />

      {filling && <p className="mb-4 text-[15px] leading-relaxed text-white/90">{t('moduleSeqInstruction')}</p>}

      <h3 className="mb-2 text-sm font-bold text-white/85">{t('moduleSeqSlotsLabel')}</h3>
      <ol className="space-y-2">
        {placed.map((itemIndex, slot) => {
          const number = slot + 1;
          const isLocked = locked[slot];
          const isWrong = wrong[slot];
          const filled = itemIndex !== null;
          const text = filled ? textOf(itemIndex) : '';
          const image = filled ? module.items[itemIndex].image : null;
          const label = filled && done ? labelOf(itemIndex) : null;
          const interactive = filling && filled && !isLocked;

          const tone = isLocked
            ? 'border-primary-light bg-primary text-white'
            : isWrong
              ? 'border-destructive/70 bg-destructive/25 text-white'
              : filled
                ? 'border-white/[0.18] bg-white/[0.14] text-white'
                : `border-dashed bg-transparent text-white/60 ${filling && slot === nextFree ? 'border-white/60' : 'border-white/25'}`;
          const badge = isLocked || isWrong ? 'bg-white/20' : filled ? 'bg-white/20' : 'bg-white/10';
          const ariaLabel = !filled
            ? t('moduleSeqSlotEmpty', { n: number })
            : isLocked
              ? t('moduleSeqSlotCorrect', { n: number, text })
              : isWrong
                ? t('moduleSeqSlotWrong', { n: number, text })
                : t('moduleSeqSlotFilled', { n: number, text });

          const content = (
            <>
              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${badge}`}>
                {isLocked ? <Check className="h-4 w-4" aria-hidden="true" /> : isWrong ? <X className="h-4 w-4" aria-hidden="true" /> : number}
              </span>
              {filled && (
                <>
                  {image && <Thumb src={image} size="h-10 w-10" />}
                  <span className="min-w-0 flex-1 text-left font-semibold leading-snug">
                    {text}
                    {label && (
                      <span className="mt-1 block">
                        <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[13px] font-bold tabular-nums">{label}</span>
                      </span>
                    )}
                  </span>
                  {interactive && <X className="h-4 w-4 flex-shrink-0 text-white/60" aria-hidden="true" />}
                </>
              )}
            </>
          );

          const className = `flex min-h-[52px] w-full items-center gap-3 rounded-[20px] border-2 px-3 py-2 transition-colors ${tone}`;
          return (
            <li key={slot}>
              {interactive ? (
                <button type="button" onClick={() => take(slot)} aria-label={ariaLabel} className={`${className} pressable hover:bg-white/20 ${FOCUS_RING}`}>
                  {content}
                </button>
              ) : (
                <div role="group" aria-label={ariaLabel} className={className}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="sr-only" role="status" aria-live="polite">
        {filling ? t('moduleSeqProgress', { placed: placedCount, total: count }) : ''}
      </p>

      {filling && pool.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-bold text-white/85">{t('moduleSeqPoolLabel')}</h3>
          <ul className="space-y-2">
            {pool.map((index) => {
              const text = textOf(index);
              const image = module.items[index].image;
              return (
                <motion.li key={index} {...layoutProps}>
                  <button
                    type="button"
                    onClick={() => place(index)}
                    aria-label={t('moduleSeqPick', { text, n: nextFree + 1 })}
                    className={`flex min-h-[52px] w-full items-center gap-3 rounded-[20px] border border-white/[0.14] bg-white/[0.08] p-3 text-left font-semibold leading-snug text-white transition-colors hover:bg-white/[0.14] pressable ${FOCUS_RING}`}
                  >
                    {image && <Thumb src={image} size="h-12 w-12" />}
                    <span className="min-w-0 flex-1">{text}</span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </>
      )}

      <div className="mt-5 space-y-3">
        {status === 'checked' && (
          <Reveal key={attempts} className="scroll-mb-4">
            <Feedback tone="error" title={t('moduleSeqWrongTitle', { correct: correctCount, total: count })}>
              {t('moduleSeqWrongText')}
            </Feedback>
          </Reveal>
        )}
        {status === 'solved' && (
          <Reveal className="scroll-mb-4">
            <Feedback tone="success" title={t('modulePlayerSolved')}>
              {explanation}
            </Feedback>
          </Reveal>
        )}
        {status === 'revealed' && (
          <Reveal className="scroll-mb-4">
            <Feedback tone="info" title={t('moduleSeqRevealedTitle')}>
              {explanation}
            </Feedback>
          </Reveal>
        )}
      </div>
    </ModuleScreen>
  );
}
