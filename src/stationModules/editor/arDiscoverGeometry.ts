/**
 * Winkelmathe für den Editor von AR-Entdecken. Bewusst ohne three.js: Der Editor liegt im Admin-Chunk
 * und soll three.js erst laden, wenn die 360°-Ansicht geöffnet wird. Die Werte entsprechen der
 * Konvention in src/ar/angles.ts (yaw rechts positiv, Bildmitte = Startblick) und src/ar/gaze.ts;
 * tests/stationModules/arDiscover.test.ts prüft die Übereinstimmung.
 */

export const MAX_PITCH = 85;

/** Trefferradien in Grad je Punktgröße (wie GAZE_RADIUS in src/ar/gaze.ts) */
export const POINT_RADIUS_DEG = { small: 4, medium: 7, large: 10 } as const;

/** Winkel auf (−180, 180] normieren */
export function wrapDeg(deg: number): number {
  const m = (((180 - deg) % 360) + 360) % 360;
  return 180 - m;
}

export function clampPitch(pitch: number): number {
  return Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch));
}

/** Bildmitte u/v (0..1) eines 2:1-Panoramas → yaw/pitch */
export function equirectToYawPitch(u: number, v: number): { yaw: number; pitch: number } {
  return { yaw: wrapDeg((u - 0.5) * 360), pitch: (0.5 - v) * 180 };
}

/** yaw/pitch → u/v (u in [0, 1)) */
export function yawPitchToEquirect(yaw: number, pitch: number): { u: number; v: number } {
  return { u: (wrapDeg(yaw) / 360 + 0.5) % 1, v: 0.5 - pitch / 180 };
}

/** Auf zwei Nachkommastellen runden (und aus −0 eine 0 machen) */
export function roundDeg(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}

/** Gültige Position für ein Modul: yaw (−180, 180], pitch ±MAX_PITCH, gerundet */
export function normalizePosition(yaw: number, pitch: number): { yaw: number; pitch: number } {
  return { yaw: roundDeg(wrapDeg(yaw)), pitch: roundDeg(clampPitch(pitch)) };
}
