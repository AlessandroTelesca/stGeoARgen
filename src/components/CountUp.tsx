import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

interface CountUpProps {
  value: number;
  /** Dauer in Sekunden */
  duration?: number;
  delay?: number;
  className?: string;
}

/** Zählt beim Erscheinen von 0 hoch und bei späteren Änderungen vom alten Wert weiter. */
export function CountUp({ value, duration = 0.9, delay = 0, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const fromRef = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduceMotion || fromRef.current === value) {
      node.textContent = String(value);
      fromRef.current = value;
      return;
    }

    const controls = animate(fromRef.current, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        // Aktuellen Zwischenstand merken, damit eine Unterbrechung nahtlos weiterzählt
        fromRef.current = latest;
        node.textContent = String(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, duration, delay, reduceMotion]);

  // Sichtbar wird hochgezählt; Screenreader lesen direkt den Endwert
  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">{reduceMotion ? value : 0}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
