import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Bottom-Sheet im dunklen Glas-Stil über der AR-Bühne (Rahmen für Info-Karte und Punkteliste).
 * Liegt im Bühnen-Container: `data-ar-nodrag` hält die Blick-Eingabe heraus, ein Tipp auf den
 * abgedunkelten Rest schließt. Escape schließt, ohne zum Player-Wrapper durchzudringen.
 */

const ease = [0.16, 1, 0.3, 1] as const;

interface ArSheetProps {
  /** id der Überschrift im Inhalt (aria-labelledby) */
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}

export function ArSheet({ labelledBy, onClose, children }: ArSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Fokus beim Öffnen auf die Hauptaktion, danach zurück zum auslösenden Element
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = rootRef.current;
    (root?.querySelector<HTMLElement>('[data-autofocus]') ?? root?.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true });
    return () => {
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  // Escape schon in der Capture-Phase abfangen, damit es den Player-Wrapper nicht erreicht
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Nur, wenn der Fokus in dieser Karte liegt (oder nirgends): Escape im Admin-Formular neben der
      // eingebetteten Vorschau bleibt unberührt, und beim Kartenwechsel schließt nur die aktive Karte
      const active = document.activeElement;
      const root = rootRef.current;
      if (active && active !== document.body && root && !root.contains(active)) return;
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <div ref={rootRef} data-ar-nodrag className="absolute inset-0 z-20 flex items-end">
      <motion.div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="ar-glass relative flex max-h-[85%] w-full flex-col rounded-t-[28px] px-5 pt-5 shadow-2xl"
        style={{ paddingBottom: 'var(--module-footer-pad, max(24px, env(safe-area-inset-bottom, 0px)))' }}
        initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
        transition={{ duration: 0.42, ease }}
      >
        {children}
      </motion.div>
    </div>
  );
}
