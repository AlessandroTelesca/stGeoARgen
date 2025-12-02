import * as THREE from 'three';

export interface ARSession {
  stop: () => void;
}

export interface ARInitOptions {
  onError?: (err: unknown) => void;
}

export const initAR = async (
  container: HTMLDivElement,
  videoElement: HTMLVideoElement,
  options: ARInitOptions = {}
): Promise<ARSession> => {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let cube: THREE.Mesh | null = null;
  let animationId: number | null = null;
  let stream: MediaStream | null = null;

  // Initialize Camera
  const initCamera = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
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
    renderer.domElement.style.pointerEvents = 'none';

    container.appendChild(renderer.domElement);

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
    scene.add(cube);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
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
      renderer.dispose();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }

    if (cube) {
      cube.geometry.dispose();
      if (Array.isArray(cube.material)) cube.material.forEach((m) => m.dispose());
      else cube.material.dispose();
    }

    window.removeEventListener('resize', handleResize);
  };

  return { stop };
};
