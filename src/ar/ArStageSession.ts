import * as THREE from 'three';
import { createPanoramaSphere } from './panoramaSphere';
import { disposeObject } from './disposeObject';
import type { ViewInput } from './inputs';

export type ArBackground = 'panorama' | 'camera' | 'neutral';
export type ArStageErrorCode = 'camera-denied' | 'camera-unavailable' | 'texture-failed';

export class ArStageError extends Error {
  readonly code: ArStageErrorCode;

  constructor(code: ArStageErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code);
    this.name = 'ArStageError';
    this.code = code;
    if (options && 'cause' in options) (this as { cause?: unknown }).cause = options.cause;
  }
}

export interface ArFrameContext {
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  /** Container-Maße in Pixeln (clientWidth/clientHeight), unabhängig von CSS-Skalierung */
  width: number;
  height: number;
  dtMs: number;
  /** Blickrichtung der Kamera (normiert); wird jedes Frame wiederverwendet, nicht aufbewahren */
  forward: THREE.Vector3;
}

export interface ArStageSessionOptions {
  background: ArBackground;
  panoramaUrl?: string | null;
  /** 'onDemand' rendert nur nach invalidate() oder bei bewegter Kamera (Editor) */
  renderMode?: 'continuous' | 'onDemand';
  /** Vertikaler Blickwinkel in Grad (Standard 70) */
  fov?: number;
  input: ViewInput;
}

const MAX_DT_MS = 100;
const NEUTRAL_RING_RADIUS = 50;

/**
 * Render-Kern für AR-Module: WebGL-Canvas im Container mit 360°-Bild, Live-Kamerabild oder neutralem
 * Hintergrund, Blickrichtung über ein ViewInput. Alle Maße kommen vom Container (nicht vom Fenster),
 * damit auch ein per CSS transform skalierter Container (Admin-Handyrahmen) korrekt rendert.
 * Die Eingabe wird am Container angebracht, Overlays im Container erreichen sie über Event-Bubbling.
 */
export class ArStageSession {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderMode: 'continuous' | 'onDemand';
  private input: ViewInput;
  private background: ArBackground;
  private panoramaUrl: string | null;

  private sphere: THREE.Mesh | null = null;
  private ring: THREE.Line | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private backgroundToken = 0;

  private readonly frameCallbacks = new Set<(ctx: ArFrameContext) => void>();
  private readonly frameContext: ArFrameContext;
  private readonly forward = new THREE.Vector3();
  private readonly lastRenderedQuaternion = new THREE.Quaternion();
  private needsRender = true;
  private width = 1;
  private height = 1;

  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private containerVisible = true;
  private started = false;
  private disposed = false;
  private rafId = 0;
  private lastTime = 0;
  private restoreContainerPosition: string | null = null;

  constructor(container: HTMLElement, opts: ArStageSessionOptions) {
    this.container = container;
    this.input = opts.input;
    this.background = opts.background;
    this.panoramaUrl = opts.panoramaUrl ?? null;
    this.renderMode = opts.renderMode ?? 'continuous';

    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 70, 1, 0.1, 500);
    this.camera.position.set(0, 0, 0);

    if (getComputedStyle(container).position === 'static') {
      this.restoreContainerPosition = container.style.position;
      container.style.position = 'relative';
    }

    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
    // Als erstes Kind: Overlays (Laser, Marker, Buttons) im Container liegen darüber
    container.insertBefore(this.canvas, container.firstChild);

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    } catch (err) {
      this.canvas.remove();
      if (this.restoreContainerPosition !== null) container.style.position = this.restoreContainerPosition;
      throw err;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, 0);

    this.frameContext = {
      camera: this.camera,
      scene: this.scene,
      width: 1,
      height: 1,
      dtMs: 0,
      forward: this.forward,
    };
    this.resize();
  }

  /** Lädt den Hintergrund (ggf. Kamera), bringt die Eingabe an und startet die Render-Schleife */
  async start(): Promise<void> {
    if (this.disposed || this.started) return;
    this.started = true;
    this.observe();
    await this.applyBackground();
    if (this.disposed) return;
    this.input.attach(this.container);
    this.updateLoop();
  }

  /** Meldet einen Callback an, der jedes Frame nach input.update und vor dem Rendern läuft; liefert die Abmeldung */
  onFrame(cb: (ctx: ArFrameContext) => void): () => void {
    this.frameCallbacks.add(cb);
    return () => {
      this.frameCallbacks.delete(cb);
    };
  }

  /** Fordert im Modus 'onDemand' ein erneutes Rendern an */
  invalidate(): void {
    this.needsRender = true;
  }

  /** Tauscht die Eingabe aus (z. B. Rückfall auf Ziehen); die Blickrichtung wird übernommen */
  setInput(input: ViewInput): void {
    if (this.disposed || input === this.input) return;
    const { yaw, pitch } = this.input.getYawPitch();
    this.input.detach();
    this.input = input;
    input.setYawPitch?.(yaw, pitch);
    if (this.started) input.attach(this.container);
    this.invalidate();
  }

  /** Wechselt den Hintergrund ohne neuen WebGL-Kontext */
  async setBackground(background: ArBackground, panoramaUrl?: string | null): Promise<void> {
    this.background = background;
    this.panoramaUrl = panoramaUrl ?? null;
    await this.applyBackground();
  }

  /** Tauscht das 360°-Bild; null entfernt es */
  async setPanorama(url: string | null): Promise<void> {
    this.panoramaUrl = url;
    if (this.background === 'panorama') await this.applyBackground();
  }

  /** Weltposition → Pixel im Container; visible ist false hinter der Kamera (x/y können außerhalb des Containers liegen) */
  projectToContainer(worldPos: THREE.Vector3): { x: number; y: number; visible: boolean } {
    this.camera.updateMatrixWorld();
    const view = worldPos.clone().applyMatrix4(this.camera.matrixWorldInverse);
    const visible = view.z < 0;
    const ndc = worldPos.clone().project(this.camera);
    return {
      x: (ndc.x * 0.5 + 0.5) * this.width,
      y: (-ndc.y * 0.5 + 0.5) * this.height,
      visible,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.backgroundToken++;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.frameCallbacks.clear();
    this.input.detach();

    disposeObject(this.scene);
    this.scene.clear();
    this.sphere = null;
    this.ring = null;
    this.stopVideo();

    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
    if (this.restoreContainerPosition !== null) this.container.style.position = this.restoreContainerPosition;
  }

  private observe(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);
    }
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        const last = entries[entries.length - 1];
        if (!last) return;
        this.containerVisible = last.isIntersecting;
        this.updateLoop();
      });
      this.intersectionObserver.observe(this.container);
    }
  }

  private readonly onVisibilityChange = (): void => {
    this.updateLoop();
  };

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.invalidate();
  }

  /** Startet bzw. stoppt die Schleife je nach Sichtbarkeit von Tab und Container */
  private updateLoop(): void {
    const shouldRun = this.started && !this.disposed && !document.hidden && this.containerVisible;
    if (shouldRun && !this.rafId) {
      this.lastTime = 0;
      this.rafId = requestAnimationFrame(this.tick);
    } else if (!shouldRun && this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private readonly tick = (time: number): void => {
    this.rafId = requestAnimationFrame(this.tick);
    const dt = this.lastTime ? Math.min(Math.max(time - this.lastTime, 0), MAX_DT_MS) : 16;
    this.lastTime = time;

    this.input.update(this.camera, dt);
    this.camera.updateMatrixWorld();
    this.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);

    const ctx = this.frameContext;
    ctx.width = this.width;
    ctx.height = this.height;
    ctx.dtMs = dt;
    for (const cb of this.frameCallbacks) cb(ctx);

    if (this.renderMode === 'continuous' || this.needsRender || !this.camera.quaternion.equals(this.lastRenderedQuaternion)) {
      this.lastRenderedQuaternion.copy(this.camera.quaternion);
      this.needsRender = false;
      this.renderer.render(this.scene, this.camera);
    }
  };

  private async applyBackground(): Promise<void> {
    const token = ++this.backgroundToken;
    this.clearBackground();

    if (this.background === 'neutral') {
      this.addRing();
    } else if (this.background === 'camera') {
      await this.startCamera(token);
    } else if (this.panoramaUrl) {
      await this.loadPanorama(this.panoramaUrl, token);
    }
    if (token === this.backgroundToken) this.invalidate();
  }

  private clearBackground(): void {
    for (const obj of [this.sphere, this.ring]) {
      if (!obj) continue;
      this.scene.remove(obj);
      disposeObject(obj);
    }
    this.sphere = null;
    this.ring = null;
    this.stopVideo();
  }

  private addRing(): void {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.sin(a) * NEUTRAL_RING_RADIUS, 0, -Math.cos(a) * NEUTRAL_RING_RADIUS));
    }
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, depthWrite: false });
    this.ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
    this.ring.name = 'HorizonRing';
    this.scene.add(this.ring);
  }

  private async loadPanorama(url: string, token: number): Promise<void> {
    let texture: THREE.Texture;
    try {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous'); // Bilder liegen auf dem API-Server
      texture = await loader.loadAsync(url);
    } catch (err) {
      throw new ArStageError('texture-failed', `Panorama konnte nicht geladen werden: ${url}`, { cause: err });
    }
    if (this.disposed || token !== this.backgroundToken) {
      texture.dispose();
      return;
    }
    this.limitTextureSize(texture);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    this.sphere = createPanoramaSphere(texture);
    this.scene.add(this.sphere);
  }

  /** Zu große Bilder über ein Canvas auf die GPU-Grenze verkleinern */
  private limitTextureSize(texture: THREE.Texture): void {
    const image = texture.image as { width: number; height: number } | undefined;
    if (!image) return;
    const max = this.renderer.capabilities.maxTextureSize;
    if (image.width <= max && image.height <= max) return;
    const scale = max / Math.max(image.width, image.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(image.width * scale));
    canvas.height = Math.max(1, Math.floor(image.height * scale));
    canvas.getContext('2d')?.drawImage(image as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    texture.image = canvas;
  }

  private async startCamera(token: number): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new ArStageError('camera-unavailable', 'Kamerazugriff wird nicht unterstützt');
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      const denied = name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError';
      throw new ArStageError(denied ? 'camera-denied' : 'camera-unavailable', undefined, { cause: err });
    }
    if (this.disposed || token !== this.backgroundToken) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.autoplay = true;
    video.srcObject = stream;
    Object.assign(video.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' });
    // Hinter dem Canvas, das transparent darüber liegt
    this.container.insertBefore(video, this.canvas);
    this.video = video;
    this.stream = stream;
    try {
      await video.play();
    } catch (err) {
      throw new ArStageError('camera-unavailable', undefined, { cause: err });
    }
  }

  private stopVideo(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video.remove();
      this.video = null;
    }
  }
}
