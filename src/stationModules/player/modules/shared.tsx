import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

/** Sichtbarer Fokus auf der dunklen Bühne */
export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40';

/** Seitenverhältnis (Breite / Höhe) eines Bilds, sobald es geladen ist; bis dahin null */
export function useNaturalAspect(src: string | null): number | null {
  const [aspect, setAspect] = useState<number | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth > 0 && img.naturalHeight > 0) setAspect(img.naturalWidth / img.naturalHeight);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return aspect;
}

/** Stil für einen Bildbereich im Seitenverhältnis `aspect`, höchstens `maxVh` dvh hoch (Breite schrumpft mit) */
export function aspectBoxStyle(aspect: number, maxVh = 55): CSSProperties {
  return { aspectRatio: String(aspect), width: `min(100%, calc(${maxVh}dvh * ${aspect}))` };
}

/** Scrollt den Inhalt beim Einblenden in den sichtbaren Bereich (Rückmeldung unter den Antworten, Infokarte) */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [reduce]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  ariaValueText?: string;
  disabled?: boolean;
}

/** Großer Schieberegler für die dunkle Bühne (weißer Griff, Füllung bis zum Wert, 44 px Trefferhöhe) */
export function RangeSlider({ value, min, max, step, onChange, ariaLabel, ariaValueText, disabled = false }: RangeSliderProps) {
  const pct = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  const style = {
    '--range-fill': `linear-gradient(to right, white ${pct}%, rgb(255 255 255 / 0.25) ${pct}%)`,
  } as CSSProperties;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={ariaLabel}
      aria-valuetext={ariaValueText}
      style={style}
      className={[
        'block w-full h-11 appearance-none bg-transparent cursor-pointer touch-pan-y disabled:opacity-40 disabled:cursor-default focus-visible:outline-none',
        '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[image:var(--range-fill)]',
        '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:-mt-[10px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-lg',
        '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[image:var(--range-fill)]',
        '[&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg',
        '[&:focus-visible::-webkit-slider-thumb]:ring-4 [&:focus-visible::-webkit-slider-thumb]:ring-white/40',
        '[&:focus-visible::-moz-range-thumb]:ring-4 [&:focus-visible::-moz-range-thumb]:ring-white/40',
      ].join(' ')}
    />
  );
}
