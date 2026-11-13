import * as THREE from 'three';
import { clampPitch, quaternionFromYawPitch, wrapDeg, yawFromQuaternionStable, yawPitchFromQuaternion } from './angles';

/** Steuert die Blickrichtung der Kamera (Lagesensor oder Ziehen); Winkelkonvention siehe angles.ts */
export interface ViewInput {
  attach(el: HTMLElement): void;
  detach(): void;
  /** Setzt camera.quaternion; wird jedes Frame vor dem Rendern aufgerufen */
  update(camera: THREE.PerspectiveCamera, dtMs: number): void;
  getYawPitch(): { yaw: number; pitch: number };
  setYawPitch?(yaw: number, pitch: number): void;
}

const D2R = THREE.MathUtils.DEG2RAD;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const LOCAL_Z = new THREE.Vector3(0, 0, 1);

/** Bildschirmdrehung (0, 90, 180, 270) – deviceorientation liefert Werte immer im Gerätesystem */
function screenAngleDeg(): number {
  if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle;
  }
  return typeof window.orientation === 'number' ? window.orientation : 0;
}

/**
 * Absolute Lage aus deviceorientation (Umrechnung wie three.js DeviceOrientationControls, inkl.
 * Bildschirmdrehung). alpha hat keinen festen Bezug (Kompass bzw. Startlage); daher wird die erste
 * Blickrichtung (oder nach recenter() die aktuelle) zu yaw 0.
 */
export class OrientationInput implements ViewInput {
  private raw: THREE.Quaternion | null = null;
  private readonly target = new THREE.Quaternion();
  private readonly current = new THREE.Quaternion();
  private hasCurrent = false;
  private readonly startYawCorrection = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();
  private readonly screenQuaternion = new THREE.Quaternion();
  /** Gerät flach liegend → Kamera schaut nach vorn statt nach unten (−90° um X) */
  private readonly deviceToCamera = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
  private readonly smoothing = 0.2;
  private attached = false;

  attach(_el: HTMLElement): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('deviceorientation', this.handleOrientation, true);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
  }

  /** true nach dem ersten Messwert mit alpha, beta und gamma */
  hasData(): boolean {
    return this.raw !== null;
  }

  /** Aktueller Blick wird yaw 0 */
  recenter(): void {
    if (!this.raw) return;
    this.startYawCorrection.setFromAxisAngle(WORLD_UP, yawFromQuaternionStable(this.raw) * D2R);
    this.target.copy(this.raw).premultiply(this.startYawCorrection);
  }

  update(camera: THREE.PerspectiveCamera, _dtMs: number): void {
    if (!this.raw) return;
    if (!this.hasCurrent) {
      this.current.copy(this.target);
      this.hasCurrent = true;
    } else {
      this.current.slerp(this.target, this.smoothing);
    }
    camera.quaternion.copy(this.current);
  }

  getYawPitch(): { yaw: number; pitch: number } {
    if (!this.hasCurrent) return { yaw: 0, pitch: 0 };
    return { yaw: yawFromQuaternionStable(this.current), pitch: yawPitchFromQuaternion(this.current).pitch };
  }

  private readonly handleOrientation = (event: DeviceOrientationEvent): void => {
    if (event.alpha == null || event.beta == null || event.gamma == null) return;
    const q = this.raw ?? new THREE.Quaternion();
    this.euler.set(event.beta * D2R, event.alpha * D2R, -event.gamma * D2R, 'YXZ');
    q.setFromEuler(this.euler).multiply(this.deviceToCamera);
    q.multiply(this.screenQuaternion.setFromAxisAngle(LOCAL_Z, -screenAngleDeg() * D2R));
    const first = this.raw === null;
    this.raw = q;
    if (first) this.startYawCorrection.setFromAxisAngle(WORLD_UP, yawFromQuaternionStable(q) * D2R);
    this.target.copy(q).premultiply(this.startYawCorrection);
  };
}

export interface DragInputOptions {
  /** true → keine Trägheit nach dem Loslassen */
  reducedMotion: boolean;
  /**
   * Beim Drücken aufgerufen, bevor das Ziehen beginnt. Gibt der Callback false zurück, wird nicht
   * gezogen (z. B. weil das Ziehen auf einem 3D-Modell das Modell dreht).
   */
  onDragStart?: (event: PointerEvent) => boolean | void;
  /** false → Zeiger und Tastatur werden ignoriert (Standard: true) */
  enabled?: boolean;
}

/** Zeigerbewegung in Pixeln, ab der aus einem Tipp ein Ziehen wird (Buttons im Container bleiben klickbar) */
const DRAG_START_PX = 4;
const INERTIA_TIME_CONSTANT_MS = 250;
const INERTIA_MIN_SPEED = 0.0005; // Grad pro ms
/** Zeigt der Zeiger länger als so viele ms vor dem Loslassen still, gibt es keine Trägheit */
const INERTIA_MAX_IDLE_MS = 80;
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [data-ar-nodrag]';

/**
 * Blick per Ziehen (Maus/Touch) und Pfeiltasten. Ziehen nach rechts dreht den Blick nach links
 * (der Inhalt folgt dem Finger, wie Google Street View).
 */
export class DragInput implements ViewInput {
  enabled: boolean;
  private yaw = 0;
  private pitch = 0;
  private fov = 70;
  private el: HTMLElement | null = null;
  private pointerId: number | null = null;
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private lastMoveTime = 0;
  private yawVel = 0; // Grad pro ms
  private pitchVel = 0;
  private prevTouchAction = '';
  private addedTabIndex = false;

  constructor(private readonly opts: DragInputOptions) {
    this.enabled = opts.enabled ?? true;
  }

  attach(el: HTMLElement): void {
    if (this.el) this.detach();
    this.el = el;
    this.prevTouchAction = el.style.touchAction ?? '';
    el.style.touchAction = 'none';
    if (!el.hasAttribute('tabindex')) {
      el.tabIndex = 0;
      this.addedTabIndex = true;
    }
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerEnd);
    el.addEventListener('pointercancel', this.onPointerEnd);
    el.addEventListener('keydown', this.onKeyDown);
  }

  detach(): void {
    const el = this.el;
    if (!el) return;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerEnd);
    el.removeEventListener('pointercancel', this.onPointerEnd);
    el.removeEventListener('keydown', this.onKeyDown);
    el.style.touchAction = this.prevTouchAction;
    if (this.addedTabIndex) el.removeAttribute('tabindex');
    this.addedTabIndex = false;
    this.el = null;
    this.pointerId = null;
    this.dragging = false;
    this.yawVel = 0;
    this.pitchVel = 0;
  }

  setYawPitch(yaw: number, pitch: number): void {
    this.yaw = wrapDeg(yaw);
    this.pitch = clampPitch(pitch);
    this.yawVel = 0;
    this.pitchVel = 0;
  }

  getYawPitch(): { yaw: number; pitch: number } {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  update(camera: THREE.PerspectiveCamera, dtMs: number): void {
    this.fov = camera.fov;
    if (!this.dragging && (this.yawVel !== 0 || this.pitchVel !== 0)) {
      this.yaw = wrapDeg(this.yaw + this.yawVel * dtMs);
      this.pitch = clampPitch(this.pitch + this.pitchVel * dtMs);
      const decay = Math.exp(-dtMs / INERTIA_TIME_CONSTANT_MS);
      this.yawVel *= decay;
      this.pitchVel *= decay;
      if (Math.hypot(this.yawVel, this.pitchVel) < INERTIA_MIN_SPEED) {
        this.yawVel = 0;
        this.pitchVel = 0;
      }
    }
    quaternionFromYawPitch(this.yaw, this.pitch, camera.quaternion);
  }

  private degPerPixel(): number {
    return this.fov / Math.max(1, this.el?.clientHeight ?? 1);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled || this.pointerId !== null) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target instanceof Element && event.target !== this.el && event.target.closest(INTERACTIVE_SELECTOR)) return;
    if (this.opts.onDragStart?.(event) === false) return;
    this.pointerId = event.pointerId ?? 0;
    this.dragging = false;
    this.startX = this.lastX = event.clientX;
    this.startY = this.lastY = event.clientY;
    this.lastMoveTime = event.timeStamp;
    this.yawVel = 0;
    this.pitchVel = 0;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.pointerId === null || (event.pointerId ?? 0) !== this.pointerId) return;
    if (!this.dragging) {
      if (Math.hypot(event.clientX - this.startX, event.clientY - this.startY) < DRAG_START_PX) return;
      this.dragging = true;
      // Erst ab hier Zeiger einfangen, damit ein einfacher Tipp auf Buttons nicht umgeleitet wird
      try {
        this.el?.setPointerCapture?.(this.pointerId);
      } catch {
        // Zeiger schon beendet
      }
    }
    const dpp = this.degPerPixel();
    const dYaw = -(event.clientX - this.lastX) * dpp;
    const dPitch = (event.clientY - this.lastY) * dpp;
    this.yaw = wrapDeg(this.yaw + dYaw);
    this.pitch = clampPitch(this.pitch + dPitch);
    const dt = event.timeStamp - this.lastMoveTime;
    if (dt > 0) {
      // Geglättete Geschwindigkeit für die Trägheit
      this.yawVel = 0.6 * (dYaw / dt) + 0.4 * this.yawVel;
      this.pitchVel = 0.6 * (dPitch / dt) + 0.4 * this.pitchVel;
    }
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.lastMoveTime = event.timeStamp;
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (this.pointerId === null || (event.pointerId ?? 0) !== this.pointerId) return;
    try {
      this.el?.releasePointerCapture?.(this.pointerId);
    } catch {
      // Zeiger war nicht eingefangen
    }
    const wasDragging = this.dragging;
    this.pointerId = null;
    this.dragging = false;
    if (!wasDragging || this.opts.reducedMotion || event.type === 'pointercancel' || event.timeStamp - this.lastMoveTime > INERTIA_MAX_IDLE_MS) {
      this.yawVel = 0;
      this.pitchVel = 0;
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    const step = event.shiftKey ? 30 : 5;
    switch (event.key) {
      case 'ArrowLeft':
        this.yaw = wrapDeg(this.yaw - step);
        break;
      case 'ArrowRight':
        this.yaw = wrapDeg(this.yaw + step);
        break;
      case 'ArrowUp':
        this.pitch = clampPitch(this.pitch + 5);
        break;
      case 'ArrowDown':
        this.pitch = clampPitch(this.pitch - 5);
        break;
      default:
        return;
    }
    event.preventDefault();
    this.yawVel = 0;
    this.pitchVel = 0;
  };
}

/** Eingabeart: Ziehen in der Vorschau, sonst Lagesensor auf Touch-Geräten mit deviceorientation */
export function pickInputMode({ preview, isTouch }: { preview: boolean; isTouch: boolean }): 'orientation' | 'drag' {
  if (preview) return 'drag';
  return isTouch && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window ? 'orientation' : 'drag';
}
