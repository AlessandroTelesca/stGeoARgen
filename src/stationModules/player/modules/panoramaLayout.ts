import { PANEL_YAWS_DEG } from '../../../components/ARComponents/customPanorama/PanoramaPanels';
import { wrapDeg } from '../../../ar/angles';

/**
 * Plätze der Tafeln im AR-Rundumblick (Konvention siehe src/ar/angles.ts: yaw positiv = rechts,
 * Bildmitte des 360°-Bilds = Startblick).
 *
 * Handy (CustomPanoramaQuizView mit setPanoramaBackground(…, { correctOrientation: true })) und
 * Desktop-/Vorschau-Player (ArStageSession) nutzen dieselbe Kugel (src/ar/panoramaSphere.ts). PANEL_YAWS_DEG
 * zählt im Uhrzeigersinn ab dem Startblick – damit hängt jede Tafel auf beiden Geräten vor derselben Bildstelle.
 */
export function panelStageYaw(slot: number): number {
  return wrapDeg(PANEL_YAWS_DEG[slot]);
}

/** Startblick: auf die erste Tafel, wie am Handy */
export function panelStartYaw(): number {
  return panelStageYaw(0);
}
