import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Fokusführung für modale Dialoge: beim Öffnen in den Dialog, Tab bleibt darin, Escape ruft
 * `onEscape`, beim Schließen kehrt der Fokus zum auslösenden Element zurück.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.offsetParent !== null);
    // Nach dem Einblenden fokussieren (Animation/Portal brauchen einen Moment)
    const timer = window.setTimeout(() => {
      if (ref.current && !ref.current.contains(document.activeElement)) (focusables()[0] ?? ref.current).focus();
    }, 60);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!ref.current) return;
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.stopPropagation();
        onEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = ref.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown, true);
      previous?.focus?.();
    };
  }, [active, ref]);
}
