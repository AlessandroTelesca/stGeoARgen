import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { asset } from '../lib/asset';

export { disposeObject } from './disposeObject';

let sharedLoader: GLTFLoader | null = null;

/** Ein Loader für alle Aufrufe, damit die DRACO-Decoder nur einmal geladen werden */
function getLoader(): GLTFLoader {
  if (!sharedLoader) {
    const draco = new DRACOLoader();
    // Decoder liegen in public/draco/ (aus three/examples/jsm/libs/draco/gltf), also ohne CDN
    draco.setDecoderPath(asset('draco/'));
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
    sharedLoader = loader;
  }
  return sharedLoader;
}

/** Lädt eine GLB/glTF-Datei und liefert die Szene als Gruppe (Animationen werden nicht übernommen) */
export async function loadGlb(
  url: string,
  { onProgress }: { onProgress?: (fraction: number) => void } = {},
): Promise<THREE.Group> {
  const gltf = await getLoader().loadAsync(url, (event) => {
    if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(1, event.loaded / event.total));
  });
  return gltf.scene;
}

/**
 * Packt das Modell in eine Wurzelgruppe: Pivot auf der Bodenmitte (min.y = 0, x/z zentriert), uniform
 * auf `heightM` Höhe skaliert. `size` ist die Größe in Metern nach dem Skalieren. Flache Modelle
 * ohne Höhe werden nach ihrer größten Ausdehnung skaliert.
 */
export function normalizeModel(group: THREE.Object3D, heightM: number): { root: THREE.Group; size: THREE.Vector3 } {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const reference = size.y > 1e-6 ? size.y : Math.max(size.x, size.z);
  const scale = reference > 1e-6 ? heightM / reference : 1;

  group.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
  const root = new THREE.Group();
  root.name = 'NormalizedModel';
  root.scale.setScalar(scale);
  root.add(group);
  return { root, size: size.multiplyScalar(scale) };
}

const TEXTURE_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'lightMap', 'envMap'] as const;

function imageSize(image: unknown): number {
  const img = image as { width?: number; height?: number; naturalWidth?: number; videoWidth?: number } | null | undefined;
  if (!img) return 0;
  const w = img.width ?? img.naturalWidth ?? img.videoWidth ?? 0;
  const h = img.height ?? 0;
  return Math.max(w, h);
}

/** Dreiecke und größte Texturkante (Pixel) eines Modells, für Grenzwerte beim Hochladen */
export function modelStats(group: THREE.Object3D): { triangles: number; maxTextureSize: number } {
  let triangles = 0;
  let maxTextureSize = 0;
  const seen = new Set<THREE.Texture>();
  group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) {
      const geometry = mesh.geometry;
      const count = geometry.index ? geometry.index.count : (geometry.attributes.position?.count ?? 0);
      const instances = (node as THREE.InstancedMesh).isInstancedMesh ? (node as THREE.InstancedMesh).count : 1;
      triangles += Math.floor(count / 3) * instances;
    }
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    for (const mat of Array.isArray(material) ? material : [material]) {
      for (const key of TEXTURE_KEYS) {
        const texture = (mat as unknown as Record<string, unknown>)[key];
        if (texture instanceof THREE.Texture && !seen.has(texture)) {
          seen.add(texture);
          maxTextureSize = Math.max(maxTextureSize, imageSize(texture.image));
        }
      }
    }
  });
  return { triangles, maxTextureSize };
}
