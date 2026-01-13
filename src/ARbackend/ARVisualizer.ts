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

<<<<<<< Updated upstream
export const initAR = async (
  container: HTMLDivElement,
  videoElement: HTMLVideoElement,
  options: ARInitOptions = {}
): Promise<ARSession> => {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let cube: THREE.Mesh | null = null;
  let cubeSpawned = false;
  let animationId: number | null = null;
  let stream: MediaStream | null = null;
  let raycaster: THREE.Raycaster;
  let pointer: THREE.Vector2;
=======
export class ARVisualizer implements ARSession {
  protected renderer: THREE.WebGLRenderer | null = null;
  protected scene: THREE.Scene | null = null;
  protected camera: THREE.PerspectiveCamera | null = null;
  protected animationId: number | null = null;
  private stream: MediaStream | null = null;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private container: HTMLDivElement;
  protected videoElement: HTMLVideoElement;
  private options: ARInitOptions;
>>>>>>> Stashed changes

  // Initialize Camera
  const initCamera = async () => {
    try {
<<<<<<< Updated upstream
      stream = await navigator.mediaDevices.getUserMedia({
=======
      console.log('[ARVisualizer] Requesting camera access...');
      this.stream = await navigator.mediaDevices.getUserMedia({
>>>>>>> Stashed changes
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      videoElement.srcObject = stream;
      await videoElement.play();
    } catch (err) {
      options.onError?.(err);
      throw err;
    }
  };

  const initThree = () => {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.zIndex = '10';
    // Enable pointer events for hit-testing
    renderer.domElement.style.pointerEvents = 'auto';

    container.appendChild(renderer.domElement);

    // Cube will be created on first pointer event (tap/click)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Initialize raycaster and pointer
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    // Pointer event handler
    const handlePointer = (clientX: number, clientY: number) => {
      if (!renderer || !camera) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      if (!cubeSpawned) {
        // Intersect with a plane at z=0 in world space
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersection)) {
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
          cube = new THREE.Mesh(geometry, material);
          cube.add(wireframe);
          cube.position.copy(intersection);
          scene?.add(cube);
          cubeSpawned = true;
        }
        return;
      }

      if (cube) {
        const intersects = raycaster.intersectObject(cube, true);
        if (intersects.length > 0) {
          options.onCubeHit?.(intersects[0]);
        }
      }
    };

    // Mouse event
    const onMouseDown = (event: MouseEvent) => {
      handlePointer(event.clientX, event.clientY);
    };
    // Touch event
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        handlePointer(event.touches[0].clientX, event.touches[0].clientY);
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('touchstart', onTouchStart);

    // Store for cleanup
    (renderer.domElement as any)._arPointerHandlers = { onMouseDown, onTouchStart };
  };

  const animate = () => {
    animationId = requestAnimationFrame(animate);

    if (cube) {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  };

  const handleResize = () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  await initCamera();
  initThree();
  animate();

  window.addEventListener('resize', handleResize);

  const stop = () => {
    if (animationId) cancelAnimationFrame(animationId);
    if (stream) stream.getTracks().forEach((t) => t.stop());

    if (renderer) {
      // Remove pointer event listeners
      const handlers = (renderer.domElement as any)._arPointerHandlers;
      if (handlers) {
        renderer.domElement.removeEventListener('mousedown', handlers.onMouseDown);
        renderer.domElement.removeEventListener('touchstart', handlers.onTouchStart);
      }
      renderer.dispose();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }

<<<<<<< Updated upstream
    if (cube) {
      cube.geometry.dispose();
      if (Array.isArray(cube.material)) cube.material.forEach((m) => m.dispose());
      else cube.material.dispose();
    }
=======
    window.removeEventListener('resize', this.handleResize);
  }

  public getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }
}
>>>>>>> Stashed changes

    window.removeEventListener('resize', handleResize);
  };

  return { stop };
};
