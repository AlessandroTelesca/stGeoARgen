/**
 * Raummathe für das 3D-Modell-Modul (model3d), bewusst ohne three.js: Der Editor liegt im Admin-Chunk
 * und rechnet Draufsicht und Infopunkte, ohne three.js zu laden. src/ar/modelStage.ts (mit three.js)
 * nutzt dieselben Funktionen; tests/stationModules/model3d.test.tsx prüft die Übereinstimmung mit three.js.
 *
 * Normierter Modellraum (Position eines Infopunkts): Bodenmitte des Modells = (0, 0, 0), alle Längen
 * geteilt durch die Modellhöhe (bei flachen Modellen durch die größte Ausdehnung). x/z liegen also
 * etwa in −1…1 (±0,5 am Rand eines quadratischen Modells), y in 0…1 (Oberkante = 1). Der Raum dreht
 * sich mit dem Modell. Die Weltlage folgt der Konvention aus src/ar/angles.ts: Kamera im Ursprung,
 * Startblick nach −Z, yaw positiv = rechts. Die Drehung des Modells um die Hochachse ist die
 * three.js-Euler-Drehung `rotation.y` (positiv = gegen den Uhrzeigersinn von oben, die Vorderseite
 * wandert nach rechts); `rotation_deg` im Modul dreht dagegen im Uhrzeigersinn (also rotation.y = −rotation_deg).
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Platzierung eines Modells (Teil von Model3dModule) */
export interface ModelPlacement {
  yaw: number;
  distance_m: number;
  elevation_m: number;
  height_m: number;
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Zulässiger Bereich für Infopunkte im normierten Raum (Einheit = Modellhöhe). Großzügig, weil breite,
 * flache Modelle (z. B. eine Lok) weit über ±1 Modellhöhe hinausreichen. Gleiche Grenzen in
 * api/station_modules_lib.php (model3d, info_points).
 */
export const NORMALIZED_LIMITS = { xz: 5, yMax: 3 } as const;

/** Mittelpunkt der Modell-Unterkante in der Welt */
export function modelOrigin({ yaw, distance_m, elevation_m }: Pick<ModelPlacement, 'yaw' | 'distance_m' | 'elevation_m'>): Vec3 {
  return { x: Math.sin(yaw * RAD) * distance_m, y: elevation_m, z: -Math.cos(yaw * RAD) * distance_m };
}

/** three.js-Drehung `rotation.y` (Bogenmaß) aus Startdrehung (Grad, im Uhrzeigersinn) und zusätzlicher Drehung `spinRad` */
export function modelRotationY(rotationDeg: number, spinRad = 0): number {
  return -rotationDeg * RAD + spinRad;
}

/** Drehung um die Hochachse wie THREE.Vector3.applyAxisAngle(Y, angle) */
function rotateY(v: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: v.x * cos + v.z * sin, y: v.y, z: -v.x * sin + v.z * cos };
}

/** Normierter Modellraum → Welt */
export function normalizedToWorld(n: Vec3, origin: Vec3, rotationY: number, heightM: number): Vec3 {
  const r = rotateY({ x: n.x * heightM, y: n.y * heightM, z: n.z * heightM }, rotationY);
  return { x: origin.x + r.x, y: origin.y + r.y, z: origin.z + r.z };
}

/** Welt → normierter Modellraum (Gegenstück zu normalizedToWorld) */
export function worldToNormalized(w: Vec3, origin: Vec3, rotationY: number, heightM: number): Vec3 {
  const r = rotateY({ x: w.x - origin.x, y: w.y - origin.y, z: w.z - origin.z }, -rotationY);
  return { x: r.x / heightM, y: r.y / heightM, z: r.z / heightM };
}

const round4 = (value: number): number => Math.round(value * 10000) / 10000 + 0;

/** Position für einen Infopunkt: in den zulässigen Bereich bringen und auf 4 Stellen runden */
export function clampNormalized(n: Vec3): Vec3 {
  const { xz, yMax } = NORMALIZED_LIMITS;
  return {
    x: round4(Math.min(xz, Math.max(-xz, n.x))),
    y: round4(Math.min(yMax, Math.max(0, n.y))),
    z: round4(Math.min(xz, Math.max(-xz, n.z))),
  };
}

// ---------------------------------------------------------------------------------------------
// Draufsicht (Editor): Besucher:in in der Mitte, Startblick nach oben
// ---------------------------------------------------------------------------------------------

/** Winkel auf (−180, 180] normieren */
export function wrapYaw(deg: number): number {
  const m = (((180 - deg) % 360) + 360) % 360;
  return 180 - m;
}

/** Position (yaw, Abstand) → Punkt in der Draufsicht; `scale` = Einheiten pro Meter, y wächst nach unten */
export function placementToTopView(yaw: number, distance: number, scale: number): { x: number; y: number } {
  return { x: Math.sin(yaw * RAD) * distance * scale + 0, y: -Math.cos(yaw * RAD) * distance * scale + 0 };
}

/** Punkt in der Draufsicht → Position (yaw auf 0,1°, Abstand auf 0,1 m gerundet, begrenzt auf min…max) */
export function topViewToPlacement(x: number, y: number, scale: number, minDistance: number, maxDistance: number): { yaw: number; distance_m: number } {
  const distance = Math.hypot(x, y) / scale;
  const yaw = x === 0 && y === 0 ? 0 : Math.atan2(x, -y) * DEG;
  return {
    yaw: Math.round(wrapYaw(yaw) * 10) / 10 + 0,
    distance_m: Math.round(Math.min(maxDistance, Math.max(minDistance, distance)) * 10) / 10,
  };
}
