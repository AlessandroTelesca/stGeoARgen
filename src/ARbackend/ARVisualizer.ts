import * as THREE from 'three';

export interface ARSession {
  stop: () => void;
}

export interface ARInitOptions {
  onError?: (err: unknown) => void;
  /**
   * Called when the cube is hit by a pointer (mouse or touch)
   * @param intersection The intersection object from Three.js
   */
  onCubeHit?: (intersection: THREE.Intersection) => void;
}

export class ARVisualizer implements ARSession {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private cube: THREE.Mesh | null = null;
  private cubeSpawned = false;
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

  private initThree(): void {
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

  private handlePointer(clientX: number, clientY: number): void {
    if (!this.renderer || !this.camera) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    if (!this.cubeSpawned) {
      // Intersect with a plane at z=0 in world space
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(plane, intersection)) {
        // Create and add the cube at the intersection point
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          wireframe: false,
          transparent: true,
          opacity: 0.8,
        });
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        this.cube = new THREE.Mesh(geometry, material);
        this.cube.add(wireframe);
        this.cube.position.copy(intersection);
        this.scene?.add(this.cube);
        this.cubeSpawned = true;
      }
      return;
    }

    if (this.cube) {
      const intersects = this.raycaster.intersectObject(this.cube, true);
      if (intersects.length > 0) {
        this.options.onCubeHit?.(intersects[0]);
      }
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.cube) {
      this.cube.rotation.x += 0.01;
      this.cube.rotation.y += 0.01;
    }

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

    if (this.cube) {
      this.cube.geometry.dispose();
      if (Array.isArray(this.cube.material)) this.cube.material.forEach((m) => m.dispose());
      else this.cube.material.dispose();
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
