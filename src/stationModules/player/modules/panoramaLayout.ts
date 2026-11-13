import { PANEL_YAWS_DEG } from '../../../components/ARComponents/customPanorama/PanoramaPanels';
import { wrapDeg } from '../../../ar/angles';

/**
 * Plätze der Tafeln im AR-Rundumblick auf der Bühne (AR-Kern, Konvention siehe src/ar/angles.ts).
 *
 * Handy-Ansicht (CustomPanoramaQuizView): Die Kugel ist GyroARVisualizer.setPanoramaBackground, also
 * SphereGeometry(120) mit BackSide, ohne scale(−1, 1, 1) und ohne Drehung. Das Bild erscheint von innen
 * damit seitenverkehrt: Der Äquator-Vertex zu u (Bildspalte, 0..1) liegt bei yaw = (0,75 − u)·360, also
 * u = 0,75 vorn (yaw 0), u = 0,5 rechts (yaw 90), u = 0,25 hinten und u = 0 links (yaw −90); u wächst
 * gegen den Uhrzeigersinn. PANEL_YAWS_DEG zählt im Uhrzeigersinn ab Startblick (yaw wie im AR-Kern:
 * positiv = rechts). Die Tafel auf Platz mit Handy-yaw Y hängt dort also vor der Bildspalte u = 0,75 − Y/360.
 *
 * Bühnen-Kern (createPanoramaSphere): Bild nicht gespiegelt, yaw = (u − 0,5)·360. Soll dieselbe Tafel
 * vor derselben Bildstelle hängen, gilt (0,75 − Y/360 − 0,5)·360 = 90 − Y.
 * Die Tafeln laufen im Bühnen-Player daher gegen den Uhrzeigersinn (nach links), das Bild selbst ist
 * dafür richtig herum; die Bildstelle je Tafel bleibt wie am Handy.
 */
export function yawLegacyToStage(legacyYawDeg: number): number {
  return wrapDeg(90 - legacyYawDeg);
}

/**
 * yaw einer Tafel im Bühnen-Player. Mit 360°-Bild wie yawLegacyToStage (gleiche Bildstelle wie am Handy);
 * ohne Bild (neutraler Hintergrund statt Live-Kamera) gibt es nichts, was gleich bleiben müsste:
 * dort laufen die Tafeln im Uhrzeigersinn ab dem Startblick.
 */
export function panelStageYaw(slot: number, withPanorama: boolean): number {
  const legacy = PANEL_YAWS_DEG[slot];
  return withPanorama ? yawLegacyToStage(legacy) : wrapDeg(legacy);
}

/** Startblick: auf die erste Tafel, wie am Handy (dort ist der Startblick Platz 1) */
export function panelStartYaw(withPanorama: boolean): number {
  return panelStageYaw(0, withPanorama);
}
