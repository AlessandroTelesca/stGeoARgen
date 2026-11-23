import { useRef, type KeyboardEvent } from 'react';
import { FieldError } from '../../components/StationAdminPanel/adminFormParts';
import { Switch } from '../../components/Settings';
import { useLanguage } from '../../contexts/LanguageContext';

interface PassThresholdFieldProps {
  /** Bestehensgrenze; null/undefined = Punkte immer */
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** Höchstwert: Fragenzahl (count) bzw. 1 (solve) */
  max: number;
  /** count: Mindestanzahl auf Anhieb richtiger Antworten; solve: Aufgabe muss gelöst werden */
  kind: 'count' | 'solve';
  error?: string;
}

/** Standardgrenze beim Einschalten: bis 3 Fragen alle richtig, sonst etwa 60 % */
function defaultThreshold(max: number): number {
  return Math.max(1, max <= 3 ? max : Math.ceil(max * 0.6));
}

/** „Punkte nur bei bestandener Aufgabe“: Schalter, bei Quiz zusätzlich die Mindestanzahl als antippbare Kreise */
export function PassThresholdField({ value, onChange, max, kind, error }: PassThresholdFieldProps) {
  const { t } = useLanguage();
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = value != null;
  const current = enabled ? Math.min(Math.max(1, value), Math.max(1, max)) : 0;

  const toggle = () => onChange(enabled ? null : kind === 'solve' ? 1 : defaultThreshold(max));

  const select = (n: number) => {
    const next = Math.min(Math.max(1, n), max);
    onChange(next);
    radios.current[next - 1]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      select(current + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      select(current - 1);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
        <div className="min-w-0">
          <span className="block text-sm font-bold">{t('passThresholdToggle')}</span>
          <p className="text-xs leading-snug text-muted-foreground">{t('passThresholdHint')}</p>
        </div>
        <Switch checked={enabled} onChange={toggle} label={t('passThresholdToggle')} />
      </div>

      {enabled && kind === 'solve' && <p className="mt-2 text-xs text-muted-foreground">{t('passThresholdSolve')}</p>}

      {enabled && kind === 'count' && (
        <div className="mt-3">
          <div role="radiogroup" aria-label={t('passThresholdToggle')} onKeyDown={onKeyDown} className="flex flex-wrap gap-2">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                ref={(el) => {
                  radios.current[n - 1] = el;
                }}
                type="button"
                role="radio"
                aria-checked={n === current}
                aria-label={t('passThresholdOption', { n, max })}
                tabIndex={n === current ? 0 : -1}
                onClick={() => select(n)}
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums transition-colors ${
                  n <= current ? 'border-primary bg-primary text-white' : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">{t('passThresholdCount', { n: current, max })}</p>
        </div>
      )}
      <FieldError message={error} />
    </div>
  );
}
