import { useCallback, useEffect, useRef, useState } from 'react';
import { CompassHeading, type CompassReading } from './compass';
import { requestMotionPermission } from './motionPermission';

/**
 * - 'idle': ausgeschaltet
 * - 'needs-permission': iOS, Freigabe per Tipp nötig (request() aus dem Klick-Handler aufrufen)
 * - 'waiting': hört zu, noch kein Messwert mit Nordbezug
 * - 'active': Messwerte kommen
 * - 'unavailable': kein Kompass (Rechner, kein Sensor, kein HTTPS) oder kein Messwert in WAIT_MS
 * - 'denied': Freigabe abgelehnt
 */
export type CompassStatus = 'idle' | 'needs-permission' | 'waiting' | 'active' | 'unavailable' | 'denied';

/** So lange auf den ersten Messwert warten, bevor es als „kein Kompass“ gilt */
const WAIT_MS = 3000;

function needsPermission(): boolean {
  const ctor = typeof DeviceOrientationEvent === 'undefined' ? undefined : (DeviceOrientationEvent as { requestPermission?: unknown });
  return typeof ctor?.requestPermission === 'function';
}

/** Kompass-Richtung des Geräts für React; ohne Freigabe-Pflicht startet er sofort */
export function useCompass(enabled: boolean): { status: CompassStatus; reading: CompassReading | null; request: () => Promise<void> } {
  const [status, setStatus] = useState<CompassStatus>('idle');
  const [reading, setReading] = useState<CompassReading | null>(null);
  const compassRef = useRef<CompassHeading | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    compassRef.current?.stop();
    compassRef.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    const compass = new CompassHeading();
    compassRef.current = compass;
    compass.onChange((next) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      setReading(next);
      setStatus('active');
    });
    setStatus('waiting');
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (!compass.hasData()) setStatus('unavailable');
    }, WAIT_MS);
    compass.start();
  }, [stop]);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) setStatus('unavailable');
    else if (needsPermission()) setStatus('needs-permission');
    else start();
    return stop;
  }, [enabled, start, stop]);

  const request = useCallback(async () => {
    // Erster await im Tipp-Handler (iOS)
    const result = await requestMotionPermission();
    if (result === 'granted') start();
    else setStatus(result === 'denied' ? 'denied' : 'unavailable');
  }, [start]);

  return { status, reading, request };
}
