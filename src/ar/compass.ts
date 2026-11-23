/**
 * Kompass-Richtung (Grad im Uhrzeigersinn ab magnetisch Nord, Bereich [0, 360)) der Blickrichtung
 * der Rückkamera, inkl. Ausgleich der Bildschirmdrehung.
 *
 * Quellen je Plattform:
 * - Android (Chromium): Ereignis `deviceorientationabsolute`, alpha bezogen auf Nord
 * - iOS (WebKit): `webkitCompassHeading` im normalen `deviceorientation` (braucht vorher
 *   requestMotionPermission() aus einem Tipp-Handler)
 * - sonst `deviceorientation` nur, wenn `event.absolute === true` (z. B. Firefox Android)
 * Relative Messwerte (ohne Nordbezug) werden ignoriert. Nur in sicheren Kontexten (HTTPS).
 */
import * as THREE from 'three';
import { yawFromQuaternionStable } from './angles';
import { screenAngleDeg } from './inputs';

const D2R = THREE.MathUtils.DEG2RAD;
const R2D = THREE.MathUtils.RAD2DEG;
const LOCAL_Z = new THREE.Vector3(0, 0, 1);
/** Gerät flach liegend → Kamera schaut nach vorn statt nach unten (−90° um X) */
const DEVICE_TO_CAMERA = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);

const euler = new THREE.Euler();
const scratchQ = new THREE.Quaternion();
const screenQ = new THREE.Quaternion();

/** Winkel auf [0, 360) normieren */
export function normalizeHeading(deg: number): number {
  const h = ((deg % 360) + 360) % 360;
  return h === 360 ? 0 : h;
}

/**
 * Kompass-Richtung aus absoluten Lagewinkeln (W3C: alpha um Z, beta um X, gamma um Y; alpha 0 = Nord).
 * Kamera-Konvention wie three.js DeviceOrientationControls: −Z = Nord, +X = Ost. Bei fast senkrechtem
 * Blick (Gerät flach) zählt die Bildschirm-Oberkante (siehe yawFromQuaternionStable).
 */
export function headingFromOrientation(alpha: number, beta: number, gamma: number, screenAngle = 0): number {
  euler.set(beta * D2R, alpha * D2R, -gamma * D2R, 'YXZ');
  scratchQ.setFromEuler(euler).multiply(DEVICE_TO_CAMERA);
  scratchQ.multiply(screenQ.setFromAxisAngle(LOCAL_Z, -screenAngle * D2R));
  return normalizeHeading(yawFromQuaternionStable(scratchQ));
}

type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };

export type CompassSource = 'absolute' | 'webkit';

export interface CompassReading {
  /** Geglättete Richtung in Grad [0, 360) */
  heading: number;
  /** Ungenauigkeit in Grad (nur iOS), sonst null */
  accuracy: number | null;
  source: CompassSource;
}

export interface CompassOptions {
  /** Gewicht des alten Werts je Messung, 0 = keine Glättung (Standard 0.8) */
  smoothing?: number;
  /** Ortsmissweisung in Grad (Ost positiv), ergibt geografisch Nord statt magnetisch Nord (Standard 0) */
  declinationDeg?: number;
}

/**
 * Liest die Kompass-Richtung des Geräts. Glättung über sin/cos, damit der Sprung 359° → 0° nicht
 * über 180° läuft.
 */
export class CompassHeading {
  private readonly smoothing: number;
  private readonly declinationDeg: number;
  private x = 0;
  private y = 0;
  private reading: CompassReading | null = null;
  private eventName: 'deviceorientation' | 'deviceorientationabsolute' | null = null;
  private readonly listeners = new Set<(reading: CompassReading) => void>();

  constructor(options: CompassOptions = {}) {
    this.smoothing = Math.min(0.99, Math.max(0, options.smoothing ?? 0.8));
    this.declinationDeg = options.declinationDeg ?? 0;
  }

  start(): void {
    if (this.eventName || typeof window === 'undefined') return;
    this.eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(this.eventName, this.handleOrientation as EventListener, true);
  }

  stop(): void {
    if (!this.eventName) return;
    window.removeEventListener(this.eventName, this.handleOrientation as EventListener, true);
    this.eventName = null;
  }

  /** true nach dem ersten Messwert mit Nordbezug */
  hasData(): boolean {
    return this.reading !== null;
  }

  getReading(): CompassReading | null {
    return this.reading;
  }

  /** Meldet jede neue Messung; gibt eine Abmeldefunktion zurück */
  onChange(cb: (reading: CompassReading) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private readonly handleOrientation = (event: CompassEvent): void => {
    let raw: number;
    let accuracy: number | null = null;
    let source: CompassSource;

    if (typeof event.webkitCompassHeading === 'number' && !Number.isNaN(event.webkitCompassHeading)) {
      const acc = event.webkitCompassAccuracy;
      // −1 = unbrauchbar (Kalibrierung nötig)
      if (typeof acc === 'number' && acc < 0) return;
      // webkitCompassHeading bezieht sich auf die Hochformat-Oberkante des Geräts
      raw = event.webkitCompassHeading + screenAngleDeg();
      accuracy = typeof acc === 'number' ? acc : null;
      source = 'webkit';
    } else {
      const isAbsolute = event.type === 'deviceorientationabsolute' || event.absolute === true;
      if (!isAbsolute || event.alpha == null || event.beta == null || event.gamma == null) return;
      raw = headingFromOrientation(event.alpha, event.beta, event.gamma, screenAngleDeg());
      source = 'absolute';
    }

    const rad = (raw + this.declinationDeg) * D2R;
    if (this.reading === null) {
      this.x = Math.cos(rad);
      this.y = Math.sin(rad);
    } else {
      const k = 1 - this.smoothing;
      this.x += k * (Math.cos(rad) - this.x);
      this.y += k * (Math.sin(rad) - this.y);
    }
    this.reading = { heading: normalizeHeading(Math.atan2(this.y, this.x) * R2D), accuracy, source };
    for (const cb of this.listeners) cb(this.reading);
  };
}
