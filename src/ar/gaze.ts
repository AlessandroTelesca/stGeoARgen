import * as THREE from 'three';
import { angleBetweenDeg } from './angles';

/** Ziel für das Anvisieren; `dir` ist eine normierte Richtung oder eine Funktion dafür (bewegliche Ziele) */
export interface GazeTarget {
  id: string;
  dir: THREE.Vector3 | (() => THREE.Vector3);
  /** Trefferradius als Winkel in Grad */
  radiusDeg: number;
  /** false → wird nie gewählt (Standard: true) */
  enabled?: boolean;
}

/** Übliche Trefferradien in Grad */
export const GAZE_RADIUS = { small: 4, medium: 7, large: 10 } as const;

/**
 * Wählt das Ziel, auf das `forward` zeigt: das mit dem kleinsten Winkel unter seinem Radius. Das bisher
 * gewählte Ziel (`currentId`) bleibt gewählt, solange sein Winkel kleiner als radius·hysteresis ist,
 * damit der Laser an der Kante des Treffers nicht flackert.
 */
export function pickGazeTarget(
  forward: THREE.Vector3,
  targets: readonly GazeTarget[],
  currentId: string | null,
  hysteresis = 1.3,
): string | null {
  let bestId: string | null = null;
  let bestAngle = Infinity;
  for (const target of targets) {
    if (target.enabled === false) continue;
    const dir = typeof target.dir === 'function' ? target.dir() : target.dir;
    const angle = angleBetweenDeg(forward, dir);
    if (target.id === currentId && angle < target.radiusDeg * hysteresis) return currentId;
    if (angle < target.radiusDeg && angle < bestAngle) {
      bestAngle = angle;
      bestId = target.id;
    }
  }
  return bestId;
}
