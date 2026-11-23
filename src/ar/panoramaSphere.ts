import * as THREE from 'three';

/**
 * Kugel für ein equirektangulares 360°-Bild, von innen betrachtet; Kamera im Ursprung.
 *
 * Herleitung der Ausrichtung (Konvention siehe angles.ts: Bildmitte u = 0.5 liegt bei −Z, u wächst nach rechts):
 * - three.SphereGeometry legt den Vertex zu (u, v) mit φ = 2π·u und θ = π·v (v = 0 oben) auf
 *   x = −r·cos φ·sin θ, y = r·cos θ, z = r·sin φ·sin θ. UV-Koordinaten sind (u, 1 − v), uv.y = 1 ist also
 *   OBEN im Bild (WebGL-Textur mit flipY), und Bildzeile v_bild = 1 − uv.y.
 * - geometry.scale(−1, 1, 1) kehrt x um (x = +r·cos φ·sin θ) und dreht damit die Dreiecke nach innen;
 *   FrontSide zeigt dann die Innenseite, das Bild erscheint von innen nicht gespiegelt.
 * - Gewünscht ist yaw = 2π·u − π, also (x, z) ∝ (sin yaw, −cos yaw) = (−sin φ, cos φ). Die Kugel liefert
 *   (cos φ, sin φ). Eine Drehung um Y mit Winkel θ bildet (x, z) auf (x·cosθ + z·sinθ, −x·sinθ + z·cosθ) ab;
 *   θ = −π/2 ergibt (−sin φ, cos φ). Daher mesh.rotation.y = −π/2.
 * Der Test tests/ar/panoramaSphere.test.ts prüft das für alle Vertices.
 */
export const PANORAMA_SPHERE_ROTATION_Y = -Math.PI / 2;

export function createPanoramaSphere(texture: THREE.Texture, radius = 100): THREE.Mesh {
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.SphereGeometry(radius, 64, 32);
  geometry.scale(-1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'PanoramaSphere';
  mesh.rotation.y = PANORAMA_SPHERE_ROTATION_Y;
  mesh.renderOrder = -1000;
  return mesh;
}
