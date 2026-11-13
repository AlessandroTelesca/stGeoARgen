/**
 * Winkelkonvention des AR-Kerns (verbindlich für alle Dateien unter src/ar/):
 *
 * - Die Kamera sitzt im Ursprung, der Startblick geht nach −Z, „oben“ ist +Y, „rechts“ ist +X.
 * - yaw in Grad: positiv = nach RECHTS drehen (im Uhrzeigersinn von oben gesehen), Bereich (−180, 180].
 * - pitch in Grad: positiv = nach oben. Für Blickrichtungen der Kamera wird auf ±MAX_PITCH begrenzt
 *   (clampPitch); die reinen Umrechnungen lassen auch ±90 zu.
 * - Richtung: x = sin(yaw)·cos(pitch), y = sin(pitch), z = −cos(yaw)·cos(pitch).
 * - Equirektangulares Bild: Bildmitte u = 0.5 ist der Startblick (yaw 0), u wächst nach rechts,
 *   also yaw = (u − 0.5)·360. v = 0 ist oben, also pitch = (0.5 − v)·180.
 * - Kameralage aus yaw/pitch: Euler 'YXZ' mit rotation.y = −yaw·π/180, rotation.x = pitch·π/180.
 */
import * as THREE from 'three';

export const MAX_PITCH = 85;

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Winkel auf (−180, 180] normieren */
export function wrapDeg(deg: number): number {
  const m = (((180 - deg) % 360) + 360) % 360;
  return 180 - m;
}

/** Pitch auf ±MAX_PITCH begrenzen */
export function clampPitch(pitch: number): number {
  return Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch));
}

/** Einheitsvektor der Richtung zu yaw/pitch (Grad) */
export function dirFromYawPitch(yaw: number, pitch: number, target = new THREE.Vector3()): THREE.Vector3 {
  const y = yaw * RAD;
  const p = pitch * RAD;
  return target.set(Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p));
}

/** yaw/pitch (Grad) einer Richtung; der Vektor muss nicht normiert sein. Senkrecht nach oben/unten → yaw 0 */
export function yawPitchFromDir(v: THREE.Vector3): { yaw: number; pitch: number } {
  const len = v.length();
  if (len === 0) return { yaw: 0, pitch: 0 };
  const pitch = Math.asin(Math.min(1, Math.max(-1, v.y / len))) * DEG;
  const yaw = v.x === 0 && v.z === 0 ? 0 : Math.atan2(v.x, -v.z) * DEG;
  return { yaw: wrapDeg(yaw), pitch };
}

const forwardScratch = new THREE.Vector3();
const upScratch = new THREE.Vector3();

/** yaw/pitch der Blickrichtung (0, 0, −1) einer Kameralage */
export function yawPitchFromQuaternion(q: THREE.Quaternion): { yaw: number; pitch: number } {
  return yawPitchFromDir(forwardScratch.set(0, 0, -1).applyQuaternion(q));
}

/**
 * Blickrichtung (yaw) einer Kameralage, unabhängig vom seitlichen Kippen des Geräts. Bei fast
 * senkrechtem Blick (steiler als ~72°) hat die Blickrichtung kaum einen waagerechten Anteil; dann
 * zeigt die Bildschirm-Oberkante nach vorn (Blick nach unten) bzw. hinten (nach oben).
 */
export function yawFromQuaternionStable(q: THREE.Quaternion): number {
  const f = forwardScratch.set(0, 0, -1).applyQuaternion(q);
  const u = upScratch.set(0, 1, 0).applyQuaternion(q);
  const horizontal = Math.hypot(f.x, f.z);
  const fallback = Math.min(1, Math.max(0, (0.3 - horizontal) / 0.3)) * Math.sign(f.y);
  const hx = f.x - fallback * u.x;
  const hz = f.z - fallback * u.z;
  if (hx === 0 && hz === 0) return 0;
  return wrapDeg(Math.atan2(hx, -hz) * DEG);
}

/** Pixel-Mitte u/v (0..1) eines equirektangulären Bildes → yaw/pitch */
export function equirectToYawPitch(u: number, v: number): { yaw: number; pitch: number } {
  return { yaw: wrapDeg((u - 0.5) * 360), pitch: (0.5 - v) * 180 };
}

/** yaw/pitch → u/v (0..1) eines equirektangulären Bildes; u liegt in [0, 1) */
export function yawPitchToEquirect(yaw: number, pitch: number): { u: number; v: number } {
  const u = (wrapDeg(yaw) / 360 + 0.5) % 1;
  return { u, v: 0.5 - pitch / 180 };
}

/** Winkel in Grad (0..180) zwischen zwei Richtungen; die Vektoren müssen nicht normiert sein */
export function angleBetweenDeg(a: THREE.Vector3, b: THREE.Vector3): number {
  const cross = new THREE.Vector3().crossVectors(a, b).length();
  return Math.atan2(cross, a.dot(b)) * DEG;
}

const euler = new THREE.Euler();

/** Setzt die Kameralage aus yaw/pitch nach der Konvention oben (schreibt in `target`) */
export function quaternionFromYawPitch(yaw: number, pitch: number, target: THREE.Quaternion): THREE.Quaternion {
  euler.set(pitch * RAD, -yaw * RAD, 0, 'YXZ');
  return target.setFromEuler(euler);
}
