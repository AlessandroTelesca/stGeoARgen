import { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { pickLang } from '../../types';
import { Feedback, GlassCard, ModuleHeading, ModuleScreen, PrimaryButton, type ModulePlayerProps } from '../ui';
import { RangeSlider, Reveal } from './shared';

/** Nachkommastellen eines Werts (für Schrittweite 0.5 usw.) */
function decimalsOf(value: number): number {
  const s = String(value);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

/** Schätzfrage: Zahl per Regler schätzen, danach Auflösung mit Marker auf der Skala */
export function EstimatePlayer({ module, lang, continueLabel, onContinue }: ModulePlayerProps<'estimate'>) {
  const { t } = useLanguage();
  const { min, max, step, answer, tolerance } = module;
  const decimals = Math.max(decimalsOf(step), decimalsOf(min));
  const clampSnap = (v: number) => {
    const snapped = min + Math.round((v - min) / step) * step;
    return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals));
  };

  const [value, setValue] = useState(() => clampSnap((min + max) / 2));
  const [submitted, setSubmitted] = useState(false);

  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const unit = pickLang(lang, module.unit_de, module.unit_en);
  const num = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: decimals });
  const withUnit = (v: number) => (unit ? `${num(v)} ${unit}` : num(v));

  const title = pickLang(lang, module.title_de, module.title_en) ?? t('moduleEstimate');
  const explanation = pickLang(lang, module.explanation_de, module.explanation_en);

  const range = max - min;
  const diff = Number(Math.abs(value - answer).toFixed(6));
  const closeLimit = tolerance > 0 ? tolerance * 3 : range * 0.1;
  const rating = diff <= tolerance ? 'bullseye' : diff <= closeLimit ? 'close' : 'miss';
  const pctOf = (v: number) => (range > 0 ? Math.min(100, Math.max(0, ((v - min) / range) * 100)) : 0);
  const toleranceLeft = pctOf(answer - tolerance);
  const toleranceRight = pctOf(answer + tolerance);

  return (
    <ModuleScreen
      footer={
        <PrimaryButton onClick={submitted ? onContinue : () => setSubmitted(true)}>
          {submitted ? continueLabel : t('modulePlayerSubmitEstimate')}
        </PrimaryButton>
      }
    >
      <ModuleHeading title={title} />
      <GlassCard className="mb-6">
        <p className="text-[17px] font-bold leading-snug text-white whitespace-pre-line">{pickLang(lang, module.question_de, module.question_en)}</p>
      </GlassCard>

      <div className="text-center tabular-nums" aria-live="polite">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-white/70">{t('modulePlayerEstimateValue')}</p>
        <p className="mt-1 text-white">
          <span className="text-[44px] leading-none font-extrabold">{num(value)}</span>
          {unit && <span className="ml-2 text-lg font-bold text-white/80">{unit}</span>}
        </p>
      </div>

      {!submitted ? (
        <div className="mt-5">
          <RangeSlider
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(v) => setValue(clampSnap(v))}
            ariaLabel={t('modulePlayerEstimateSlider')}
            ariaValueText={withUnit(value)}
          />
          <div className="mt-1 flex justify-between text-[14px] font-semibold text-white/70 tabular-nums">
            <span>{withUnit(min)}</span>
            <span>{withUnit(max)}</span>
          </div>
        </div>
      ) : (
        <Reveal className="mt-5 scroll-mb-4 space-y-4">
          {/* Skala mit Schätzung (weiß), richtiger Antwort (grün) und Toleranzbereich */}
          <div className="px-4 pt-2">
            <div className="relative h-10">
              <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/25" />
              {tolerance > 0 && (
                <div
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary-light/70"
                  style={{ left: `${toleranceLeft}%`, width: `${Math.max(toleranceRight - toleranceLeft, 0)}%` }}
                />
              )}
              <span
                className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg"
                style={{ left: `${pctOf(value)}%` }}
                aria-hidden="true"
              />
              <span
                className="absolute top-1/2 w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border-[3px] border-white shadow-lg"
                style={{ left: `${pctOf(answer)}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="mt-1 flex justify-between text-[14px] font-semibold text-white/70 tabular-nums">
              <span>{withUnit(min)}</span>
              <span>{withUnit(max)}</span>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-2 text-center tabular-nums">
            {[
              [t('modulePlayerEstimateValue'), withUnit(value)],
              [t('modulePlayerEstimateAnswer'), withUnit(answer)],
              [t('modulePlayerEstimateDeviation'), withUnit(diff)],
            ].map(([label, text]) => (
              <GlassCard key={label} className="px-2 py-3">
                <dt className="text-[12px] font-medium text-white/70">{label}</dt>
                <dd className="mt-1 text-[15px] font-extrabold text-white break-words">{text}</dd>
              </GlassCard>
            ))}
          </dl>

          {rating === 'bullseye' && (
            <Feedback tone="reward" title={t('modulePlayerEstimateBullseye')}>
              {explanation}
            </Feedback>
          )}
          {rating === 'close' && (
            <Feedback tone="success" title={t('modulePlayerEstimateClose')}>
              {explanation}
            </Feedback>
          )}
          {rating === 'miss' && (
            <Feedback tone="info" title={t('modulePlayerEstimateMiss', { answer: withUnit(answer) })}>
              {explanation}
            </Feedback>
          )}
        </Reveal>
      )}
    </ModuleScreen>
  );
}
