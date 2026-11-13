import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createPanoramaSphere } from '../../src/ar/panoramaSphere';
import { dirFromYawPitch, equirectToYawPitch } from '../../src/ar/angles';

/**
 * Bildkoordinate (u, v_bild) → Weltrichtung des zugehörigen Vertex. SphereGeometry hat uv.y = 1 − v_bild
 * (uv.y = 1 oben), daher wird der Vertex mit uv = (u, 1 − v_bild) gesucht.
 */
function worldDirOfImagePoint(mesh: THREE.Mesh, u: number, v: number): THREE.Vector3 {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const uv = geometry.getAttribute('uv');
  const pos = geometry.getAttribute('position');
  mesh.updateMatrixWorld(true);
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < uv.count; i++) {
    const d = Math.hypot(uv.getX(i) - u, uv.getY(i) - (1 - v));
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  expect(bestDist).toBeLessThan(1e-9);
  const local = new THREE.Vector3(pos.getX(best), pos.getY(best), pos.getZ(best));
  return mesh.localToWorld(local).normalize();
}

function expectDir(actual: THREE.Vector3, expected: THREE.Vector3) {
  expect(actual.x).toBeCloseTo(expected.x, 5);
  expect(actual.y).toBeCloseTo(expected.y, 5);
  expect(actual.z).toBeCloseTo(expected.z, 5);
}

describe('createPanoramaSphere', () => {
  const mesh = createPanoramaSphere(new THREE.Texture());

  it('Bildmitte liegt im Startblick −Z', () => {
    expectDir(worldDirOfImagePoint(mesh, 0.5, 0.5), new THREE.Vector3(0, 0, -1));
  });

  it('rechts im Bild (u = 0.75) ist +X (yaw 90), links (u = 0.25) −X', () => {
    expectDir(worldDirOfImagePoint(mesh, 0.75, 0.5), new THREE.Vector3(1, 0, 0));
    expectDir(worldDirOfImagePoint(mesh, 0.25, 0.5), new THREE.Vector3(-1, 0, 0));
  });

  it('Bildrand (u = 0) liegt hinter dem Betrachter (+Z)', () => {
    expectDir(worldDirOfImagePoint(mesh, 0, 0.5), new THREE.Vector3(0, 0, 1));
  });

  it('oberes Bilddrittel (v = 0.25) liegt oben (pitch 45)', () => {
    const dir = worldDirOfImagePoint(mesh, 0.5, 0.25);
    expect(dir.y).toBeCloseTo(Math.sin(Math.PI / 4), 5);
    expectDir(dir, dirFromYawPitch(0, 45));
  });

  it('alle Vertices stimmen mit dirFromYawPitch(equirectToYawPitch(u, v)) überein', () => {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const uv = geometry.getAttribute('uv');
    const pos = geometry.getAttribute('position');
    mesh.updateMatrixWorld(true);
    for (let i = 0; i < uv.count; i++) {
      const { yaw, pitch } = equirectToYawPitch(uv.getX(i), 1 - uv.getY(i));
      const expected = dirFromYawPitch(yaw, pitch);
      const actual = mesh.localToWorld(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))).normalize();
      expect(actual.distanceTo(expected)).toBeLessThan(1e-5);
    }
  });

  it('verwendet sRGB, FrontSide und die gewünschte Kugelgröße', () => {
    const texture = new THREE.Texture();
    const sphere = createPanoramaSphere(texture, 50);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect((sphere.material as THREE.MeshBasicMaterial).side).toBe(THREE.FrontSide);
    sphere.geometry.computeBoundingSphere();
    expect(sphere.geometry.boundingSphere?.radius).toBeCloseTo(50);
  });
});
