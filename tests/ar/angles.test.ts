import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  angleBetweenDeg,
  clampPitch,
  dirFromYawPitch,
  equirectToYawPitch,
  quaternionFromYawPitch,
  wrapDeg,
  yawPitchFromDir,
  yawPitchFromQuaternion,
  yawPitchToEquirect,
} from '../../src/ar/angles';

describe('wrapDeg', () => {
  it('normiert auf (-180, 180]', () => {
    expect(wrapDeg(0)).toBe(0);
    expect(wrapDeg(190)).toBeCloseTo(-170);
    expect(wrapDeg(-190)).toBeCloseTo(170);
    expect(wrapDeg(720 + 45)).toBeCloseTo(45);
    expect(wrapDeg(-720 - 45)).toBeCloseTo(-45);
  });

  it('behandelt die Grenze ±180 als +180', () => {
    expect(wrapDeg(180)).toBe(180);
    expect(wrapDeg(-180)).toBe(180);
    expect(wrapDeg(540)).toBe(180);
    expect(wrapDeg(-540)).toBe(180);
  });
});

describe('clampPitch', () => {
  it('begrenzt auf ±85', () => {
    expect(clampPitch(90)).toBe(85);
    expect(clampPitch(-120)).toBe(-85);
    expect(clampPitch(30)).toBe(30);
  });
});

describe('dirFromYawPitch', () => {
  it('folgt der Konvention (Start −Z, yaw rechts = +X, pitch oben = +Y)', () => {
    const f = dirFromYawPitch(0, 0);
    expect(f.x).toBeCloseTo(0);
    expect(f.y).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(-1);
    const r = dirFromYawPitch(90, 0);
    expect(r.x).toBeCloseTo(1);
    expect(r.z).toBeCloseTo(0);
    expect(dirFromYawPitch(-90, 0).x).toBeCloseTo(-1);
    expect(dirFromYawPitch(180, 0).z).toBeCloseTo(1);
    expect(dirFromYawPitch(0, 90).y).toBeCloseTo(1);
  });

  it('liefert Einheitsvektoren', () => {
    expect(dirFromYawPitch(33, -41).length()).toBeCloseTo(1);
  });
});

describe('Rundreisen', () => {
  const samples: [number, number][] = [
    [0, 0],
    [90, 0],
    [-90, 30],
    [135, -45],
    [-135, 60],
    [179, 10],
    [-179, -10],
    [180, 0],
  ];

  it('yaw/pitch → dir → yaw/pitch', () => {
    for (const [yaw, pitch] of samples) {
      const back = yawPitchFromDir(dirFromYawPitch(yaw, pitch));
      expect(back.pitch).toBeCloseTo(pitch, 6);
      expect(wrapDeg(back.yaw - yaw)).toBeCloseTo(0, 6);
    }
  });

  it('yaw/pitch → equirect → yaw/pitch', () => {
    for (const [yaw, pitch] of samples) {
      const { u, v } = yawPitchToEquirect(yaw, pitch);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      const back = equirectToYawPitch(u, v);
      expect(back.pitch).toBeCloseTo(pitch, 6);
      expect(wrapDeg(back.yaw - yaw)).toBeCloseTo(0, 6);
    }
  });

  it('yaw/pitch → Quaternion → yaw/pitch', () => {
    for (const [yaw, pitch] of samples) {
      const q = quaternionFromYawPitch(yaw, pitch, new THREE.Quaternion());
      const back = yawPitchFromQuaternion(q);
      expect(back.pitch).toBeCloseTo(pitch, 6);
      expect(wrapDeg(back.yaw - yaw)).toBeCloseTo(0, 6);
    }
  });
});

describe('equirect', () => {
  it('Bildmitte ist der Startblick, links/rechts/oben stimmen', () => {
    expect(equirectToYawPitch(0.5, 0.5)).toEqual({ yaw: 0, pitch: 0 });
    expect(equirectToYawPitch(0.75, 0.5).yaw).toBeCloseTo(90);
    expect(equirectToYawPitch(0.25, 0.5).yaw).toBeCloseTo(-90);
    expect(equirectToYawPitch(0.5, 0).pitch).toBeCloseTo(90);
    expect(equirectToYawPitch(0.5, 0.25).pitch).toBeCloseTo(45);
  });

  it('Bildrand u = 0 und u = 1 liegt bei 180°', () => {
    expect(equirectToYawPitch(0, 0.5).yaw).toBe(180);
    expect(equirectToYawPitch(1, 0.5).yaw).toBe(180);
    expect(yawPitchToEquirect(180, 0).u).toBeCloseTo(0);
  });
});

describe('angleBetweenDeg', () => {
  it('misst den Winkel zwischen Richtungen, auch über ±180°', () => {
    expect(angleBetweenDeg(dirFromYawPitch(0, 0), dirFromYawPitch(90, 0))).toBeCloseTo(90);
    expect(angleBetweenDeg(dirFromYawPitch(170, 0), dirFromYawPitch(-170, 0))).toBeCloseTo(20);
    expect(angleBetweenDeg(dirFromYawPitch(10, 20), dirFromYawPitch(10, 20))).toBeCloseTo(0);
    expect(angleBetweenDeg(dirFromYawPitch(0, 0), dirFromYawPitch(180, 0))).toBeCloseTo(180);
  });

  it('akzeptiert nicht normierte Vektoren', () => {
    expect(angleBetweenDeg(new THREE.Vector3(0, 0, -5), new THREE.Vector3(3, 0, 0))).toBeCloseTo(90);
  });
});
