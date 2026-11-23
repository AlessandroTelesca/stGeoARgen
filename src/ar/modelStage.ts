import * as THREE from 'three';
import type { ArFrameContext, ArStageSession } from './ArStageSession';
import { disposeObject, loadGlb, modelStats, normalizeModel } from './loadGlb';
import { modelOrigin, modelRotationY, normalizedToWorld, worldToNormalized, type ModelPlacement, type Vec3 } from './modelSpace';

/**
 * Das 3D-Modell einer ArStageSession: Beleuchtung, Platzierung, Drehung (automatisch, Ziehen, Buttons),
 * weicher Bodenschatten und Umrechnung zwischen Welt und normiertem Modellraum (siehe modelSpace.ts).
 * Player (Model3dPlayer) und Editor-Vorschau (ModelStagePreview) nutzen dieselbe Klasse und sehen
 * dadurch genau dasselbe. Die Parameter dürfen jederzeit per setParams() geändert werden und wirken im
 * nächsten Bild; nur ein anderes Modell braucht load().
 */

export interface ModelStageParams extends ModelPlacement {
  /** Startdrehung in Grad (im Uhrzeigersinn von oben) */
  rotation_deg: number;
  auto_rotate: 'off' | 'slow' | 'normal';
}

/** Automatische Drehung in Grad pro Sekunde */
export const AUTO_ROTATE_DEG_PER_S = { off: 0, slow: 10, normal: 25 } as const;
/** So lange pausiert die automatische Drehung nach dem Loslassen */
export const AUTO_ROTATE_RESUME_MS = 3000;
/** Ein Punkt gilt als verdeckt, wenn das Modell die Sichtlinie früher als so viel Anteil der Distanz trifft */
export const OCCLUSION_TOLERANCE = 0.02;
/** Boden ≈ Augenhöhe − 1,6 m; nur dann steht das Modell „auf dem Boden“ und bekommt einen Schatten */
export const GROUND_ELEVATION_M = -1.6;
const GROUND_TOLERANCE_M = 0.6;

// Farben und Stärken der Szene (Daten für three.js, kein Komponenten-Styling)
const SKY_COLOR = 0xffffff;
const GROUND_COLOR = 0x888888;
const HEMISPHERE_INTENSITY = 1.0;
const SUN_COLOR = 0xffffff;
const SUN_INTENSITY = 1.2;
/** Die Sonne steht über den Besucher:innen und leuchtet schräg von vorn-oben auf das Modell */
const SUN_HEIGHT_M = 6;
const SHADOW_COLOR = 0x000000;
const SHADOW_OPACITY = 0.25;
const SHADOW_PADDING = 1.15;
/** Glättung der Button-Drehung (Zeitkonstante in ms) */
const SPIN_SMOOTHING_MS = 90;

const RAD = Math.PI / 180;

export class ModelStage {
  /** Wurzel der Bühne: liegt auf der Bodenmitte des Modells in der Welt */
  readonly group = new THREE.Group();
  /** Bodenmitte des Modells in der Welt (nach dem letzten Bild) */
  readonly origin = new THREE.Vector3();

  private readonly session: ArStageSession;
  private readonly reducedMotion: boolean;
  private readonly sun: THREE.DirectionalLight;
  private readonly lights: THREE.Object3D[];
  private readonly shadow: THREE.Mesh;
  private readonly pickRay = new THREE.Raycaster();
  private readonly sightRay = new THREE.Raycaster();
  private readonly offFrame: () => void;

  private params: ModelStageParams;
  private root: THREE.Group | null = null;
  /** Skalierung, die das Modell auf Höhe 1 bringt; mal height_m ergibt die Weltgröße */
  private baseScale = 1;
  private shadowRadius = 0.5;
  private spin = 0;
  private spinTarget = 0;
  private interacting = false;
  private lastInteractionAt = -Infinity;
  private loadToken = 0;
  private disposed = false;

  constructor(session: ArStageSession, params: ModelStageParams, { reducedMotion }: { reducedMotion: boolean }) {
    this.session = session;
    this.params = params;
    this.reducedMotion = reducedMotion;

    const hemisphere = new THREE.HemisphereLight(SKY_COLOR, GROUND_COLOR, HEMISPHERE_INTENSITY);
    this.sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
    this.sun.position.set(0, SUN_HEIGHT_M, 0);
    this.lights = [hemisphere, this.sun, this.sun.target];

    const shadowMaterial = new THREE.MeshBasicMaterial({ color: SHADOW_COLOR, transparent: true, opacity: SHADOW_OPACITY, depthWrite: false });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.005;
    this.shadow.visible = false;
    this.group.name = 'ModelStage';
    this.group.add(this.shadow);

    session.scene.add(...this.lights, this.group);
    this.applyPlacement();
    this.offFrame = session.onFrame((ctx) => this.update(ctx));
  }

  /** Neue Platzierung, wirkt im nächsten Bild */
  setParams(params: ModelStageParams): void {
    this.params = params;
    this.applyPlacement();
    this.session.invalidate();
  }

  get loaded(): boolean {
    return this.root !== null;
  }

  /** Aktuelle Drehung des Modells (three.js rotation.y) */
  get rotationY(): number {
    return modelRotationY(this.params.rotation_deg, this.spin);
  }

  get heightM(): number {
    return this.params.height_m;
  }

  /** Lädt das GLB und stellt es auf; ein früherer Ladevorgang wird verworfen. Wirft bei Fehlern. */
  async load(url: string, onProgress?: (fraction: number) => void): Promise<{ triangles: number; maxTextureSize: number }> {
    const token = ++this.loadToken;
    const loaded = await loadGlb(url, { onProgress });
    if (this.disposed || token !== this.loadToken) {
      disposeObject(loaded);
      throw new DOMException('Ladevorgang abgebrochen', 'AbortError');
    }
    const stats = modelStats(loaded);
    this.clearModel();
    const { root, size } = normalizeModel(loaded, 1);
    this.root = root;
    this.baseScale = root.scale.x;
    this.shadowRadius = (Math.max(size.x, size.z) / 2) * SHADOW_PADDING;
    this.group.add(root);
    this.applyPlacement();
    this.session.invalidate();
    return stats;
  }

  /** Normierter Modellraum → Welt */
  pointToWorld(n: Vec3, target = new THREE.Vector3()): THREE.Vector3 {
    const w = normalizedToWorld(n, this.origin, this.rotationY, this.params.height_m);
    return target.set(w.x, w.y, w.z);
  }

  /** Welt → normierter Modellraum */
  worldToPoint(world: THREE.Vector3): Vec3 {
    return worldToNormalized(world, this.origin, this.rotationY, this.params.height_m);
  }

  /** Mitte der Oberkante (für die Beschriftung) */
  topWorld(target = new THREE.Vector3()): THREE.Vector3 {
    return target.set(this.origin.x, this.origin.y + this.params.height_m, this.origin.z);
  }

  /** Mitte des Modells */
  centerWorld(target = new THREE.Vector3()): THREE.Vector3 {
    return target.set(this.origin.x, this.origin.y + this.params.height_m / 2, this.origin.z);
  }

  /** Weltposition der Stelle auf dem Modell unter einem Bildschirmpunkt (NDC −1…1), sonst null */
  pickWorld(ndcX: number, ndcY: number): THREE.Vector3 | null {
    const root = this.root;
    if (!root) return null;
    root.updateMatrixWorld(true);
    this.session.camera.updateMatrixWorld();
    this.pickRay.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.session.camera);
    const hit = this.pickRay.intersectObject(root, true)[0];
    return hit ? hit.point.clone() : null;
  }

  /** Verdeckt das Modell die Sichtlinie von der Kamera zu `world`? */
  isOccluded(world: THREE.Vector3): boolean {
    const root = this.root;
    if (!root) return false;
    root.updateMatrixWorld(true);
    const from = this.session.camera.position;
    const direction = new THREE.Vector3().subVectors(world, from);
    const distance = direction.length();
    if (distance < 1e-6) return false;
    this.sightRay.set(from, direction.divideScalar(distance));
    this.sightRay.near = 0;
    this.sightRay.far = distance;
    const hit = this.sightRay.intersectObject(root, true)[0];
    return !!hit && hit.distance < distance * (1 - OCCLUSION_TOLERANCE);
  }

  /** Beginn eines Ziehens am Modell: die automatische Drehung pausiert */
  beginInteraction(): void {
    this.interacting = true;
    this.lastInteractionAt = performance.now();
  }

  endInteraction(): void {
    this.interacting = false;
    this.lastInteractionAt = performance.now();
  }

  /** Direkte Drehung beim Ziehen (Bogenmaß, rotation.y-Richtung: positiv = Vorderseite nach rechts) */
  dragBy(radians: number): void {
    this.spin += radians;
    this.spinTarget += radians;
    this.lastInteractionAt = performance.now();
  }

  /** Weiche Drehung per Button (Grad; positiv = Vorderseite nach rechts) */
  rotateBy(degrees: number): void {
    this.spinTarget += degrees * RAD;
    this.lastInteractionAt = performance.now();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loadToken++;
    this.offFrame();
    this.session.scene.remove(...this.lights, this.group);
    this.clearModel();
    disposeObject(this.group);
  }

  private clearModel(): void {
    if (this.root) {
      this.group.remove(this.root);
      disposeObject(this.root);
    }
    this.root = null;
  }

  /** Position, Größe, Drehung und Schatten aus den Parametern übernehmen */
  private applyPlacement(): void {
    const { height_m, elevation_m } = this.params;
    const o = modelOrigin(this.params);
    this.origin.set(o.x, o.y, o.z);
    this.group.position.copy(this.origin);
    this.sun.target.position.copy(this.origin);
    if (this.root) {
      this.root.scale.setScalar(this.baseScale * height_m);
      this.root.rotation.y = this.rotationY;
    }
    const onGround = Math.abs(elevation_m - GROUND_ELEVATION_M) <= GROUND_TOLERANCE_M;
    this.shadow.visible = this.root !== null && onGround;
    this.shadow.scale.setScalar(this.shadowRadius * height_m);
  }

  private update(ctx: ArFrameContext): void {
    if (!this.root) return;
    const dt = ctx.dtMs;
    const rate = AUTO_ROTATE_DEG_PER_S[this.params.auto_rotate] * RAD;
    const idle = !this.interacting && performance.now() - this.lastInteractionAt > AUTO_ROTATE_RESUME_MS;
    if (rate > 0 && idle && !this.reducedMotion) {
      const step = (rate * dt) / 1000;
      this.spin += step;
      this.spinTarget += step;
    }
    if (this.spin !== this.spinTarget) {
      this.spin = this.reducedMotion ? this.spinTarget : this.spin + (this.spinTarget - this.spin) * (1 - Math.exp(-dt / SPIN_SMOOTHING_MS));
      if (Math.abs(this.spinTarget - this.spin) < 1e-4) this.spin = this.spinTarget;
    }
    this.applyPlacement();
  }
}
