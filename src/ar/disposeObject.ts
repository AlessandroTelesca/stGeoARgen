import * as THREE from 'three';

/** Gibt Geometrien, Materialien, deren Texturen und Skelette eines Objektbaums frei (Objekt bleibt im Graph) */
export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((node) => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    if ((node as THREE.SkinnedMesh).isSkinnedMesh) (node as THREE.SkinnedMesh).skeleton?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    for (const mat of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(mat)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      mat.dispose();
    }
  });
}
