import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompassHeading, headingFromOrientation, normalizeHeading } from '../../src/ar/compass';

/** Kleinster Winkelabstand in Grad (0..180) */
function angDiff(a: number, b: number): number {
  const d = Math.abs(normalizeHeading(a) - normalizeHeading(b));
  return Math.min(d, 360 - d);
}

function orientationEvent(
  type: 'deviceorientation' | 'deviceorientationabsolute',
  init: DeviceOrientationEventInit,
  webkit?: { heading: number; accuracy?: number },
): DeviceOrientationEvent {
  const event = new DeviceOrientationEvent(type, init);
  if (webkit) {
    Object.defineProperty(event, 'webkitCompassHeading', { value: webkit.heading });
    if (webkit.accuracy !== undefined) Object.defineProperty(event, 'webkitCompassAccuracy', { value: webkit.accuracy });
  }
  return event;
}

describe('normalizeHeading', () => {
  it('normiert auf [0, 360)', () => {
    expect(normalizeHeading(0)).toBe(0);
    expect(normalizeHeading(360)).toBe(0);
    expect(normalizeHeading(-90)).toBe(270);
    expect(normalizeHeading(725)).toBe(5);
  });
});

describe('headingFromOrientation', () => {
  it('aufrecht gehalten: alpha 0 → Nord, alpha wächst gegen den Uhrzeigersinn', () => {
    expect(angDiff(headingFromOrientation(0, 90, 0), 0)).toBeLessThan(1e-6);
    expect(angDiff(headingFromOrientation(90, 90, 0), 270)).toBeLessThan(1e-6);
    expect(angDiff(headingFromOrientation(270, 90, 0), 90)).toBeLessThan(1e-6);
  });

  it('flach liegend zählt die Bildschirm-Oberkante', () => {
    expect(angDiff(headingFromOrientation(0, 0, 0), 0)).toBeLessThan(1e-6);
    expect(angDiff(headingFromOrientation(90, 0, 0), 270)).toBeLessThan(1e-6);
  });

  it('Querformat flach: Oberkante ist die rechte Geräteseite', () => {
    expect(angDiff(headingFromOrientation(0, 0, 0, 90), 90)).toBeLessThan(1e-6);
    expect(angDiff(headingFromOrientation(0, 0, 0, 270), 270)).toBeLessThan(1e-6);
  });

  it('Bildschirmdrehung ändert die Blickrichtung der Kamera nicht, wenn nicht steil', () => {
    expect(angDiff(headingFromOrientation(30, 80, 0, 90), headingFromOrientation(30, 80, 0, 0))).toBeLessThan(1e-6);
  });
});

describe('CompassHeading', () => {
  afterEach(() => {
    delete (window as { ondeviceorientationabsolute?: unknown }).ondeviceorientationabsolute;
  });

  it('ignoriert relative Messwerte ohne Nordbezug', () => {
    const compass = new CompassHeading();
    compass.start();
    window.dispatchEvent(orientationEvent('deviceorientation', { alpha: 90, beta: 90, gamma: 0, absolute: false }));
    expect(compass.hasData()).toBe(false);
    compass.stop();
  });

  it('nutzt deviceorientation mit absolute === true', () => {
    const compass = new CompassHeading({ smoothing: 0 });
    compass.start();
    window.dispatchEvent(orientationEvent('deviceorientation', { alpha: 90, beta: 90, gamma: 0, absolute: true }));
    const reading = compass.getReading();
    expect(reading?.source).toBe('absolute');
    expect(reading?.accuracy).toBeNull();
    expect(angDiff(reading!.heading, 270)).toBeLessThan(1e-6);
    compass.stop();
  });

  it('hört auf deviceorientationabsolute, wenn vorhanden', () => {
    (window as { ondeviceorientationabsolute?: unknown }).ondeviceorientationabsolute = null;
    const compass = new CompassHeading({ smoothing: 0 });
    compass.start();
    window.dispatchEvent(orientationEvent('deviceorientation', { alpha: 90, beta: 90, gamma: 0, absolute: true }));
    expect(compass.hasData()).toBe(false);
    window.dispatchEvent(orientationEvent('deviceorientationabsolute', { alpha: 270, beta: 90, gamma: 0 }));
    expect(angDiff(compass.getReading()!.heading, 90)).toBeLessThan(1e-6);
    compass.stop();
  });

  it('iOS: übernimmt webkitCompassHeading und Genauigkeit, verwirft Genauigkeit −1', () => {
    const compass = new CompassHeading({ smoothing: 0 });
    compass.start();
    window.dispatchEvent(orientationEvent('deviceorientation', { alpha: 10, beta: 90, gamma: 0 }, { heading: 123, accuracy: -1 }));
    expect(compass.hasData()).toBe(false);
    window.dispatchEvent(orientationEvent('deviceorientation', { alpha: 10, beta: 90, gamma: 0 }, { heading: 123, accuracy: 15 }));
    const reading = compass.getReading()!;
    expect(reading.source).toBe('webkit');
    expect(reading.accuracy).toBe(15);
    expect(reading.heading).toBeCloseTo(123);
    compass.stop();
  });

  it('glättet über den Nord-Sprung 350° → 10° hinweg', () => {
    const compass = new CompassHeading({ smoothing: 0.5 });
    compass.start();
    window.dispatchEvent(orientationEvent('deviceorientation', {}, { heading: 350 }));
    window.dispatchEvent(orientationEvent('deviceorientation', {}, { heading: 10 }));
    expect(angDiff(compass.getReading()!.heading, 0)).toBeLessThan(1e-6);
    compass.stop();
  });

  it('addiert die Ortsmissweisung', () => {
    const compass = new CompassHeading({ smoothing: 0, declinationDeg: 3 });
    compass.start();
    window.dispatchEvent(orientationEvent('deviceorientation', {}, { heading: 358 }));
    expect(compass.getReading()!.heading).toBeCloseTo(1);
    compass.stop();
  });

  it('meldet Änderungen an Abonnenten und hört nach stop() auf', () => {
    const compass = new CompassHeading({ smoothing: 0 });
    const cb = vi.fn();
    const unsubscribe = compass.onChange(cb);
    compass.start();
    window.dispatchEvent(orientationEvent('deviceorientation', {}, { heading: 45 }));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].heading).toBeCloseTo(45);
    unsubscribe();
    window.dispatchEvent(orientationEvent('deviceorientation', {}, { heading: 50 }));
    expect(cb).toHaveBeenCalledTimes(1);
    compass.stop();
    window.dispatchEvent(orientationEvent('deviceorientation', {}, { heading: 90 }));
    expect(compass.getReading()!.heading).toBeCloseTo(50);
  });
});
