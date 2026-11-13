import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DragInput, OrientationInput, pickInputMode } from '../../src/ar/inputs';
import { yawPitchFromQuaternion } from '../../src/ar/angles';

function forwardOf(camera: THREE.Camera): THREE.Vector3 {
  return new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
}

function pointer(type: string, x: number, y: number, timeStamp?: number): Event {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0 });
  if (timeStamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  return event;
}

describe('DragInput', () => {
  let el: HTMLDivElement;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', { value: 700 });
    document.body.appendChild(el);
    camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
  });

  afterEach(() => el.remove());

  it('setYawPitch(90, 0) lässt die Kamera nach +X schauen', () => {
    const input = new DragInput({ reducedMotion: true });
    input.attach(el);
    input.setYawPitch(90, 0);
    input.update(camera, 16);
    const f = forwardOf(camera);
    expect(f.x).toBeCloseTo(1);
    expect(f.y).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(0);
    input.detach();
  });

  it('Startblick ist −Z, pitch 45 schaut nach oben', () => {
    const input = new DragInput({ reducedMotion: true });
    input.update(camera, 16);
    expect(forwardOf(camera).z).toBeCloseTo(-1);
    input.setYawPitch(0, 45);
    input.update(camera, 16);
    expect(yawPitchFromQuaternion(camera.quaternion).pitch).toBeCloseTo(45);
  });

  it('begrenzt pitch auf ±85', () => {
    const input = new DragInput({ reducedMotion: true });
    input.setYawPitch(0, 120);
    expect(input.getYawPitch().pitch).toBe(85);
  });

  it('Ziehen nach rechts verringert yaw, Ziehen nach unten hebt den Blick', () => {
    const input = new DragInput({ reducedMotion: true });
    input.attach(el);
    input.update(camera, 16); // fov übernehmen
    el.dispatchEvent(pointer('pointerdown', 100, 100, 0));
    el.dispatchEvent(pointer('pointermove', 200, 150, 16));
    el.dispatchEvent(pointer('pointerup', 200, 150, 32));
    const { yaw, pitch } = input.getYawPitch();
    expect(yaw).toBeCloseTo(-100 * (70 / 700));
    expect(pitch).toBeCloseTo(50 * (70 / 700));
    input.update(camera, 16);
    expect(forwardOf(camera).x).toBeLessThan(0);
    input.detach();
  });

  it('ignoriert Bewegungen unter der Ziehschwelle (Tipp)', () => {
    const input = new DragInput({ reducedMotion: true });
    input.attach(el);
    el.dispatchEvent(pointer('pointerdown', 100, 100, 0));
    el.dispatchEvent(pointer('pointermove', 102, 101, 16));
    el.dispatchEvent(pointer('pointerup', 102, 101, 32));
    expect(input.getYawPitch()).toEqual({ yaw: 0, pitch: 0 });
    input.detach();
  });

  it('onDragStart kann das Ziehen verhindern; enabled=false sperrt', () => {
    const blocked = new DragInput({ reducedMotion: true, onDragStart: () => false });
    blocked.attach(el);
    el.dispatchEvent(pointer('pointerdown', 100, 100, 0));
    el.dispatchEvent(pointer('pointermove', 200, 100, 16));
    expect(blocked.getYawPitch().yaw).toBe(0);
    blocked.detach();

    const disabled = new DragInput({ reducedMotion: true, enabled: false });
    disabled.attach(el);
    el.dispatchEvent(pointer('pointerdown', 100, 100, 0));
    el.dispatchEvent(pointer('pointermove', 200, 100, 16));
    expect(disabled.getYawPitch().yaw).toBe(0);
    disabled.detach();
  });

  it('Trägheit nur ohne reducedMotion', () => {
    const drag = (reducedMotion: boolean) => {
      const input = new DragInput({ reducedMotion });
      input.attach(el);
      input.update(camera, 16);
      el.dispatchEvent(pointer('pointerdown', 100, 100, 0));
      el.dispatchEvent(pointer('pointermove', 140, 100, 16));
      el.dispatchEvent(pointer('pointermove', 180, 100, 32));
      el.dispatchEvent(pointer('pointerup', 180, 100, 40));
      const before = input.getYawPitch().yaw;
      for (let i = 0; i < 20; i++) input.update(camera, 16);
      const after = input.getYawPitch().yaw;
      input.detach();
      return after - before;
    };
    expect(drag(true)).toBe(0);
    expect(drag(false)).toBeLessThan(0);
  });

  it('Tastatur: Pfeile ±5°, Shift ±30°, tabIndex und touch-action werden gesetzt und zurückgenommen', () => {
    const input = new DragInput({ reducedMotion: true });
    input.attach(el);
    expect(el.tabIndex).toBe(0);
    expect(el.style.touchAction).toBe('none');
    const key = (k: string, shiftKey = false) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true }));
    key('ArrowRight');
    expect(input.getYawPitch().yaw).toBe(5);
    key('ArrowLeft', true);
    expect(input.getYawPitch().yaw).toBe(-25);
    key('ArrowUp');
    expect(input.getYawPitch().pitch).toBe(5);
    key('ArrowDown');
    key('ArrowDown');
    expect(input.getYawPitch().pitch).toBe(-5);
    input.detach();
    expect(el.hasAttribute('tabindex')).toBe(false);
    expect(el.style.touchAction).toBe('');
    key('ArrowRight');
    expect(input.getYawPitch().yaw).toBe(-25);
  });
});

describe('OrientationInput', () => {
  it('hat erst nach dem ersten vollständigen Messwert Daten', () => {
    const input = new OrientationInput();
    input.attach(document.createElement('div'));
    expect(input.hasData()).toBe(false);
    window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: null, beta: null, gamma: null }));
    expect(input.hasData()).toBe(false);
    window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 120, beta: 90, gamma: 0 }));
    expect(input.hasData()).toBe(true);
    input.detach();
  });

  it('erste Blickrichtung wird yaw 0, Drehung nach rechts erhöht yaw', () => {
    const input = new OrientationInput();
    input.attach(document.createElement('div'));
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
    // Handy aufrecht (beta 90), Kompass 120°
    window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 120, beta: 90, gamma: 0 }));
    input.update(camera, 16);
    expect(input.getYawPitch().yaw).toBeCloseTo(0, 3);
    expect(input.getYawPitch().pitch).toBeCloseTo(0, 3);
    // alpha nimmt beim Drehen nach links zu (Gegenuhrzeigersinn) → 30° nach rechts = alpha − 30
    window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 90, beta: 90, gamma: 0 }));
    for (let i = 0; i < 60; i++) input.update(camera, 16);
    expect(input.getYawPitch().yaw).toBeCloseTo(30, 1);
    input.recenter();
    for (let i = 0; i < 60; i++) input.update(camera, 16);
    expect(input.getYawPitch().yaw).toBeCloseTo(0, 1);
    input.detach();
  });
});

describe('pickInputMode', () => {
  it('Vorschau → drag', () => {
    expect(pickInputMode({ preview: true, isTouch: true })).toBe('drag');
  });

  it('Touch-Gerät mit deviceorientation → orientation, sonst drag', () => {
    const hasApi = 'DeviceOrientationEvent' in window;
    expect(pickInputMode({ preview: false, isTouch: true })).toBe(hasApi ? 'orientation' : 'drag');
    expect(pickInputMode({ preview: false, isTouch: false })).toBe('drag');
  });
});
