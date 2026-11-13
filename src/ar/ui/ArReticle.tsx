import { forwardRef, useImperativeHandle, useRef } from 'react';
import './ar.css';

/**
 * Laser + Zielkreis für die AR-Bühne.
 *
 * Der Strahl kommt vom unteren Bildrand („aus dem Handy“) und endet am Zielkreis in der Bildmitte.
 * Da die Kamera immer im Ursprung sitzt und der Blick durch die Mitte geht, ist der Strahl im Bild
 * stets dieselbe Strecke – ein CSS-Overlay ist deshalb gleichwertig zu einem 3D-Strahl, aber gestochen
 * scharf und ohne GPU-Last. Farbe: helle Tönung der (Stations-)Primärfarbe.
 *
 * Aktualisierung pro Frame NICHT über React-State, sondern imperativ über `update()` (Ref).
 */

export interface ArReticleHandle {
  /** aiming: ein Ziel liegt im Strahl; progress 0…1: Verweil-Fortschritt */
  update(aiming: boolean, progress: number): void;
}

const RING_R = 26;
const RING_LEN = 2 * Math.PI * RING_R;

export const ArReticle = forwardRef<ArReticleHandle, { className?: string }>(function ArReticle({ className = '' }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const last = useRef({ aiming: false, progress: -1 });

  useImperativeHandle(ref, () => ({
    update(aiming, progress) {
      const p = Math.max(0, Math.min(1, progress));
      if (aiming !== last.current.aiming && rootRef.current) {
        rootRef.current.dataset.aiming = aiming ? 'true' : 'false';
      }
      if (Math.abs(p - last.current.progress) > 0.002 && ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(RING_LEN * (1 - p));
      }
      last.current = { aiming, progress: p };
    },
  }), []);

  return (
    <div ref={rootRef} data-aiming="false" className={`ar-reticle pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      {/* Strahl: Elternteil trägt das Leuchten (drop-shadow), das Kind die spitz zulaufende Form (clip-path) */}
      <div className="ar-reticle__beam-glow absolute left-1/2 bottom-0 -translate-x-1/2" style={{ top: `calc(50% + ${RING_R + 6}px)` }}>
        <div className="ar-reticle__beam h-full w-full" />
      </div>

      {/* Zielkreis mit Verweil-Ring */}
      <div className="ar-reticle__target absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg width="72" height="72" viewBox="0 0 72 72" className="block overflow-visible">
          <circle cx="36" cy="36" r={RING_R} fill="none" className="ar-reticle__track" strokeWidth="3" />
          <circle
            ref={ringRef}
            cx="36"
            cy="36"
            r={RING_R}
            fill="none"
            className="ar-reticle__progress"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING_LEN}
            strokeDashoffset={RING_LEN}
            transform="rotate(-90 36 36)"
          />
          <circle cx="36" cy="36" r="4" className="ar-reticle__dot" />
        </svg>
      </div>
    </div>
  );
});
