/// <reference path="../types/webxr.d.ts" />
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface WebXRSession {
  stop: () => void;
}

export interface ARInitOptions {
  onError?: (err: unknown) => void;
  useWebXR?: boolean; // Enable WebXR for real plane detection
  domOverlayRoot?: HTMLElement; // DOM element to use for overlay (must contain UI)
}

export class WebXRVisualizer implements WebXRSession {
  protected renderer: THREE.WebGLRenderer | null = null;
  protected scene: THREE.Scene | null = null;
  protected camera: THREE.PerspectiveCamera | null = null;
  private animationId: number | null = null;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private container: HTMLDivElement;
  private options: ARInitOptions;
  protected isGroundDetected: boolean = false;
  private xrSession: XRSession | null = null;
  private xrRefSpace: XRReferenceSpace | null = null;
  private xrHitTestSource: XRHitTestSource | null = null;
  protected detectedPlanePosition: THREE.Vector3 | null = null;

  constructor(
    container: HTMLDivElement,
    options: ARInitOptions = {}
  ) {
    this.container = container;
    this.options = options;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
  }

  async init(): Promise<void> {
    if (!this.options.useWebXR || !('xr' in navigator)) {
      throw new Error('WebXR is required but not available');
    }

    const isSupported = await (navigator as any).xr?.isSessionSupported('immersive-ar');
    if (!isSupported) {
      throw new Error('WebXR AR not supported on this device');
    }

    await this.initWebXR();
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
   * Initialize WebXR session for real AR plane detection (like Amazon AR).
   */
  private async initWebXR(): Promise<void> {
    try {
      const xr = (navigator as any).xr;
      if (!xr) throw new Error('WebXR not supported');

      // Request AR session with hit-test feature for plane detection
      const sessionInit: any = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
      };
      
      // Use provided dom overlay root or fallback to container
      if (this.options.domOverlayRoot) {
        sessionInit.domOverlay = { root: this.options.domOverlayRoot };
      }
      
      this.xrSession = await xr.requestSession('immersive-ar', sessionInit);

      // Initialize Three.js for WebXR
      this.initThree();
      this.renderer!.xr.enabled = true;
      this.renderer!.xr.setSession(this.xrSession);

      // Get reference space
      if (this.xrSession) {
        this.xrRefSpace = await this.xrSession.requestReferenceSpace('local');

        // Set up hit test source for plane detection
        const viewerSpace = await this.xrSession.requestReferenceSpace('viewer');
        if (this.xrSession.requestHitTestSource) {
          this.xrHitTestSource = await this.xrSession.requestHitTestSource({ space: viewerSpace }) || null;
        }

        // Start XR animation loop
        this.xrSession.requestAnimationFrame(this.onXRFrame);
      }

      console.log('WebXR AR session started - real plane detection active!');
    } catch (err) {
      console.error('WebXR initialization failed:', err);
      this.options.onError?.(err);
      throw err;
    }
  }

  /**
   * WebXR animation frame - handles real-time plane detection.
   */
  private onXRFrame = (time: number, frame: XRFrame) => {
    if (!this.xrSession || !this.xrHitTestSource) return;

    const session = this.xrSession;
    session.requestAnimationFrame(this.onXRFrame);

    // Get hit test results (detected planes)
    const hitTestResults = frame.getHitTestResults(this.xrHitTestSource);

    if (hitTestResults.length > 0 && this.xrRefSpace) {
      // Ground plane detected!
      const hit = hitTestResults[0];
      const pose = hit.getPose(this.xrRefSpace);

      if (pose) {
        const position = pose.transform.position;
        this.detectedPlanePosition = new THREE.Vector3(position.x, position.y, position.z);
        
        if (!this.isGroundDetected) {
          this.isGroundDetected = true;
          console.log('Real ground plane detected via WebXR!', this.detectedPlanePosition);
          this.onGroundDetected();
        }
      }
    }

    // Render scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  /**
   * Override this method to handle when ground is detected.
   */
  protected onGroundDetected(): void {
    // Subclasses can override this
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

  private handleResize = (): void => {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  stop(): void {
    // Stop WebXR session
    if (this.xrSession) {
      this.xrSession.end();
      this.xrSession = null;
      this.xrHitTestSource = null;
    }

    if (this.animationId) cancelAnimationFrame(this.animationId);

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
  options: ARInitOptions = {}
): Promise<WebXRSession> => {
  const visualizer = new WebXRVisualizer(container, options);
  await visualizer.init();
  return visualizer;
};
