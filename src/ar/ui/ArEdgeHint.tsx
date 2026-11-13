import { forwardRef, useImperativeHandle, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Pfeil am Bildrand in Richtung des nächsten unentdeckten Punkts – nur, wenn gerade kein Punkt im
 * Bild ist. Die Bühne ruft `place()` pro Frame imperativ auf (kein React-State).
 */

export interface ArEdgeHintHandle {
  /**
   * Richtung vom Bildmittelpunkt zum Ziel als Bildschirmwinkel in Radiant (0 = rechts, π/2 = unten);
   * null blendet den Pfeil aus
   */
  place(angleRad: number | null): void;
}

/** Abstand der Pfeilmitte zum Rand: oben Platz für Zähler und Liste, unten für Weiter-Button und Fortschrittsleiste */
const INSET = { left: 28, right: 28, top: 72, bottom: 168 };

export const ArEdgeHint = forwardRef<ArEdgeHintHandle, { className?: string }>(function ArEdgeHint({ className = '' }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const lastAngle = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    place(angleRad) {
      const root = rootRef.current;
      const arrow = arrowRef.current;
      if (!root || !arrow) return;
      if (angleRad === null) {
        if (lastAngle.current !== null) arrow.style.opacity = '0';
        lastAngle.current = null;
        return;
      }
      if (lastAngle.current !== null && Math.abs(angleRad - lastAngle.current) < 0.005) return;
      lastAngle.current = angleRad;
      const w = root.clientWidth;
      const h = root.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const dx = Math.cos(angleRad);
      const dy = Math.sin(angleRad);
      // Schnittpunkt des Strahls ab der Mitte mit dem eingerückten Rechteck
      const reachX = dx === 0 ? Infinity : (dx > 0 ? w - INSET.right - cx : cx - INSET.left) / Math.abs(dx);
      const reachY = dy === 0 ? Infinity : (dy > 0 ? h - INSET.bottom - cy : cy - INSET.top) / Math.abs(dy);
      const reach = Math.max(0, Math.min(reachX, reachY));
      arrow.style.transform = `translate3d(${(cx + dx * reach).toFixed(1)}px, ${(cy + dy * reach).toFixed(1)}px, 0) translate(-50%, -50%) rotate(${angleRad.toFixed(3)}rad)`;
      arrow.style.opacity = '1';
    },
  }), []);

  return (
    <div ref={rootRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <span
        ref={arrowRef}
        className="absolute left-0 top-0 text-white opacity-0 drop-shadow-md transition-opacity duration-200 motion-reduce:transition-none"
        style={{ willChange: 'transform' }}
      >
        <ArrowRight className="h-9 w-9" strokeWidth={3} />
      </span>
    </div>
  );
});
