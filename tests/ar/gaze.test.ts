import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GAZE_RADIUS, pickGazeTarget, type GazeTarget } from '../../src/ar/gaze';
import { dirFromYawPitch } from '../../src/ar/angles';

const target = (id: string, yaw: number, pitch = 0, radiusDeg: number = GAZE_RADIUS.medium): GazeTarget => ({
  id,
  dir: dirFromYawPitch(yaw, pitch),
  radiusDeg,
});

describe('pickGazeTarget', () => {
  it('wählt das Ziel mit dem kleinsten Winkel unter dem Radius', () => {
    const targets = [target('a', 10, 0, 10), target('b', 4, 0, 10)];
    expect(pickGazeTarget(dirFromYawPitch(0, 0), targets, null)).toBe('b');
  });

  it('wählt nichts außerhalb des Radius', () => {
    expect(pickGazeTarget(dirFromYawPitch(0, 0), [target('a', 20)], null)).toBeNull();
    expect(pickGazeTarget(dirFromYawPitch(0, 0), [], null)).toBeNull();
  });

  it('ignoriert deaktivierte Ziele', () => {
    const targets = [{ ...target('a', 0), enabled: false }, target('b', 5)];
    expect(pickGazeTarget(dirFromYawPitch(0, 0), targets, null)).toBe('b');
  });

  it('akzeptiert Richtungsfunktionen', () => {
    const moving: GazeTarget = { id: 'm', dir: () => dirFromYawPitch(2, 0), radiusDeg: 5 };
    expect(pickGazeTarget(dirFromYawPitch(0, 0), [moving], null)).toBe('m');
  });

  it('hält das aktuelle Ziel innerhalb von radius·hysteresis', () => {
    const targets = [target('a', 8, 0, 7)]; // 8° > 7°, aber < 9,1°
    expect(pickGazeTarget(dirFromYawPitch(0, 0), targets, null)).toBeNull();
    expect(pickGazeTarget(dirFromYawPitch(0, 0), targets, 'a')).toBe('a');
    expect(pickGazeTarget(dirFromYawPitch(0, 0), [target('a', 10, 0, 7)], 'a')).toBeNull();
  });

  it('bleibt beim aktuellen Ziel, auch wenn ein anderes näher liegt', () => {
    const targets = [target('a', 5, 0, 7), target('b', 1, 0, 7)];
    expect(pickGazeTarget(dirFromYawPitch(0, 0), targets, 'a')).toBe('a');
    expect(pickGazeTarget(dirFromYawPitch(0, 0), targets, null)).toBe('b');
  });

  it('funktioniert über die ±180°-Grenze', () => {
    const targets = [target('back', 178, 0, 7)];
    expect(pickGazeTarget(dirFromYawPitch(-178, 0), targets, null)).toBe('back'); // 4° entfernt
    expect(pickGazeTarget(dirFromYawPitch(-165, 0), targets, null)).toBeNull(); // 17° entfernt
  });
});
