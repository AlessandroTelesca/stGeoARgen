import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ARSession {
  stop: () => void;
}

export interface ARInitOptions {
  onError?: (err: unknown) => void;
}

export class ARVisualizer implements ARSession {
  protected renderer: THREE.WebGLRenderer | null = null;
  protected scene: THREE.Scene | null = null;
  protected camera: THREE.PerspectiveCamera | null = null;
  private animationId: number | null = null;
  private stream: MediaStream | null = null;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private container: HTMLDivElement;
  private videoElement: HTMLVideoElement;
  private options: ARInitOptions;

  constructor(
    container: HTMLDivElement,
    videoElement: HTMLVideoElement,
    options: ARInitOptions = {}
  ) {
    this.container = container;
    this.videoElement = videoElement;
    this.options = options;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
  }

  async init(): Promise<void> {
    await this.initCamera();
    this.initThree();
    this.animate();
    window.addEventListener('resize', this.handleResize);
  }

  private async initCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();
    } catch (err) {
      this.options.onError?.(err);
      throw err;
    }
  }

  protected initThree(): void {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '10';
    // Enable pointer events for hit-testing
    this.renderer.domElement.style.pointerEvents = 'auto';

    this.container.appendChild(this.renderer.domElement);

    // Cube will be created on first pointer event (tap/click)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Mouse event
    const onMouseDown = (event: MouseEvent) => {
      this.handlePointer(event.clientX, event.clientY);
    };
    // Touch event
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        this.handlePointer(event.touches[0].clientX, event.touches[0].clientY);
      }
    };

    this.renderer.domElement.addEventListener('mousedown', onMouseDown);
    this.renderer.domElement.addEventListener('touchstart', onTouchStart);

    // Store for cleanup
    (this.renderer.domElement as any)._arPointerHandlers = { onMouseDown, onTouchStart };
  }

  /**
   * Load a GLTF/GLB model and add it to the scene. Returns the loaded root object.
   */
  protected loadGLTFModel(
    url: string,
    options: {
      position?: THREE.Vector3 | [number, number, number];
      rotation?: THREE.Euler | [number, number, number];
      scale?: number | [number, number, number];
    } = {}
  ): Promise<THREE.Object3D> {
    if (!this.scene) return Promise.reject(new Error('Scene not initialized'));

    const toVector3 = (value: THREE.Vector3 | [number, number, number]): THREE.Vector3 =>
      Array.isArray(value) ? new THREE.Vector3(...value) : value;

    const toEuler = (value: THREE.Euler | [number, number, number]): THREE.Euler =>
      Array.isArray(value) ? new THREE.Euler(...value) : value;

    const loader = new GLTFLoader();

    return new Promise<THREE.Object3D>((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          if (options.position) model.position.copy(toVector3(options.position));
          if (options.rotation) model.rotation.copy(toEuler(options.rotation));

          if (options.scale) {
            if (Array.isArray(options.scale)) {
              model.scale.set(options.scale[0], options.scale[1], options.scale[2]);
            } else {
              model.scale.setScalar(options.scale);
            }
          }

          this.scene?.add(model);
          resolve(model);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  protected handlePointer(clientX: number, clientY: number): void {
    // Intentionally left blank: pointer events are kept for future interactions
    // Subclasses can override this method to handle pointer/tap events
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private handleResize = (): void => {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  stop(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());

    if (this.renderer) {
      // Remove pointer event listeners
      const handlers = (this.renderer.domElement as any)._arPointerHandlers;
      if (handlers) {
        this.renderer.domElement.removeEventListener('mousedown', handlers.onMouseDown);
        this.renderer.domElement.removeEventListener('touchstart', handlers.onTouchStart);
      }
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode)
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    window.removeEventListener('resize', this.handleResize);
  }
}

// Backwards compatibility wrapper
export const initAR = async (
  container: HTMLDivElement,
  videoElement: HTMLVideoElement,
  options: ARInitOptions = {}
): Promise<ARSession> => {
  const visualizer = new ARVisualizer(container, videoElement, options);
  await visualizer.init();
  return visualizer;
};
