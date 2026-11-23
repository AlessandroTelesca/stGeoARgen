type PermissionState = 'granted' | 'denied';
type PermissionRequestable = { requestPermission?: () => Promise<PermissionState> };

/**
 * Fragt die Freigabe für Lagesensoren an.
 *
 * WICHTIG: Unter iOS muss das der ERSTE `await` in einem Tipp-Handler (Klick auf einen Button) sein.
 * Vor dem Aufruf darf nichts anderes awaited werden, sonst gilt die Tipp-Geste nicht mehr und die
 * Anfrage wird abgelehnt.
 *
 * - Browser mit `DeviceOrientationEvent.requestPermission` (iOS): Dialog; Ergebnis der Orientierung zählt
 *   (die Bewegungsfreigabe wird wie in GyroARVisualizer zusätzlich angefragt, ihr Fehlen ist unkritisch)
 * - sonst 'granted', wenn 'DeviceOrientationEvent' existiert, sonst 'unsupported'
 */
export async function requestMotionPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return 'unsupported';

  const orientationCtor = DeviceOrientationEvent as typeof DeviceOrientationEvent & PermissionRequestable;
  const motionCtor =
    typeof DeviceMotionEvent !== 'undefined'
      ? (DeviceMotionEvent as typeof DeviceMotionEvent & PermissionRequestable)
      : undefined;

  if (typeof orientationCtor.requestPermission !== 'function') return 'granted';

  try {
    const orientation = await orientationCtor.requestPermission();
    if (orientation !== 'granted') return 'denied';
  } catch {
    return 'denied';
  }

  if (motionCtor && typeof motionCtor.requestPermission === 'function') {
    try {
      await motionCtor.requestPermission();
    } catch {
      // Nur deviceorientation wird gebraucht
    }
  }
  return 'granted';
}
