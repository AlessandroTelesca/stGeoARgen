/// <reference types="vitest" />
import { describe, test, expect } from 'vitest';
import * as THREE from 'three';
import { mapModuleMedia, MODULE_TYPES, MAX_MODEL_INFO_POINTS, type StationModule } from '../../src/stationModules/types';
import { MODULE_META, MODULE_ORDER, isArModuleType } from '../../src/stationModules/meta';
import { moduleMissingContent, moduleStructureKey } from '../../src/stationModules/player/previewSupport';
import { checkGlbHeader } from '../../src/ar/glbHeader';
import { dirFromYawPitch } from '../../src/ar/angles';
import {
  clampNormalized,
  modelOrigin,
  modelRotationY,
  normalizedToWorld,
  placementToTopView,
  topViewToPlacement,
  worldToNormalized,
} from '../../src/ar/modelSpace';
import { translations } from '../../src/i18n/translations';

const infoPoint = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  x: 0.2,
  y: 0.8,
  z: -0.1,
  title_de: 'Tor',
  title_en: null,
  text_de: 'Text',
  text_en: null,
  image: null,
  ...overrides,
});

const model3d = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'm-1',
    type: 'model3d',
    title_de: null,
    title_en: null,
    model: 'modell.glb',
    background: 'camera',
    panorama_image: null,
    height_m: 2,
    distance_m: 4,
    elevation_m: -1.6,
    yaw: 0,
    rotation_deg: 0,
    auto_rotate: 'slow',
    user_rotate: true,
    caption_de: null,
    caption_en: null,
    text_de: null,
    text_en: null,
    info_points: [infoPoint(), infoPoint({ id: 'p-2', image: 'bild.jpg' })],
    ...overrides,
  }) as unknown as StationModule<string>;

describe('model3d: Registrierung', () => {
  test('Typ, Meta, Reihenfolge, Voreinstellungen', () => {
    expect(MODULE_TYPES).toContain('model3d');
    expect(MODULE_META.model3d.immersive).toBe(true);
    expect(MODULE_META.model3d.singleton).toBeUndefined();
    expect(MODULE_ORDER.indexOf('model3d')).toBe(MODULE_ORDER.indexOf('ar_discover') + 1);
    expect(MODULE_META.model3d.presets.map((p) => p.id)).toEqual(['camera', 'panorama']);
    const created = MODULE_META.model3d.presets[0].create();
    expect(created).toMatchObject({ height_m: 2, distance_m: 4, elevation_m: -1.6, yaw: 0, rotation_deg: 0, auto_rotate: 'slow', user_rotate: true, model: null, info_points: [] });
    expect(MAX_MODEL_INFO_POINTS).toBe(8);
  });

  test('isArModuleType', () => {
    expect(isArModuleType('model3d')).toBe(true);
    expect(isArModuleType('quiz')).toBe(false);
  });

  test('i18n: DE und EN haben dieselben Schlüssel, Texte der Metadaten vorhanden', () => {
    const keys = (lang: 'de' | 'en') => Object.keys(translations[lang]).filter((k) => /^(model3d|presetModel3d|moduleModel3d|moduleEditor(Choose|Change|Remove)Model|adminModel)/.test(k)).sort();
    expect(keys('de')).toEqual(keys('en'));
    const meta = MODULE_META.model3d;
    for (const key of [meta.labelKey, meta.descriptionKey, ...meta.presets.flatMap((p) => [p.labelKey, p.descriptionKey])]) {
      expect((translations.de as Record<string, string>)[key]).toBeTruthy();
      expect((translations.en as Record<string, string>)[key]).toBeTruthy();
    }
  });
});

describe('model3d: mapModuleMedia', () => {
  test('Modell als Art "model", Panorama als "panorama", Punktbilder als "image"', () => {
    const calls: [string, string][] = [];
    const mapped = mapModuleMedia(model3d({ background: 'panorama', panorama_image: 'pano.jpg' }), (media, kind) => {
      calls.push([media, kind]);
      return `url:${media}`;
    });
    expect(calls).toEqual([['modell.glb', 'model'], ['pano.jpg', 'panorama'], ['bild.jpg', 'image']]);
    expect(mapped.type === 'model3d' && mapped.model).toBe('url:modell.glb');
    expect(mapped.type === 'model3d' && mapped.info_points.map((p) => p.image)).toEqual([null, 'url:bild.jpg']);
  });
});

describe('model3d: Vorschau', () => {
  test('fehlende Inhalte: kein Modell oder Panorama ohne Bild', () => {
    expect(moduleMissingContent(model3d())).toBe(false);
    expect(moduleMissingContent(model3d({ model: '' }))).toBe(true);
    expect(moduleMissingContent(model3d({ background: 'panorama', panorama_image: '' }))).toBe(true);
    expect(moduleMissingContent(model3d({ background: 'camera', panorama_image: null }))).toBe(false);
  });

  test('Zahlen und Texte ändern den Schlüssel nicht, Hintergrund und Kennung schon', () => {
    const base = moduleStructureKey(model3d());
    expect(moduleStructureKey(model3d({ height_m: 9, yaw: 90, caption_de: 'Neu', info_points: [] }))).toBe(base);
    expect(moduleStructureKey(model3d({ background: 'panorama' }))).not.toBe(base);
    expect(moduleStructureKey(model3d({ id: 'm-2' }))).not.toBe(base);
  });
});

describe('modelSpace', () => {
  const placement = { yaw: 35, distance_m: 6, elevation_m: -1.6, height_m: 3 };
  const rotation = modelRotationY(40, 0.3);

  test('Rundreise normiert → Welt → normiert', () => {
    const origin = modelOrigin(placement);
    for (const n of [{ x: 0, y: 0, z: 0 }, { x: 0.4, y: 1, z: -0.3 }, { x: -1, y: 1.5, z: 1 }]) {
      const back = worldToNormalized(normalizedToWorld(n, origin, rotation, placement.height_m), origin, rotation, placement.height_m);
      expect(back.x).toBeCloseTo(n.x, 9);
      expect(back.y).toBeCloseTo(n.y, 9);
      expect(back.z).toBeCloseTo(n.z, 9);
    }
  });

  test('stimmt mit three.js überein: Ursprung wie dirFromYawPitch, Drehung wie rotation.y', () => {
    const origin = modelOrigin(placement);
    const dir = dirFromYawPitch(placement.yaw, 0).multiplyScalar(placement.distance_m);
    expect(origin.x).toBeCloseTo(dir.x, 9);
    expect(origin.z).toBeCloseTo(dir.z, 9);
    expect(origin.y).toBe(-1.6);

    // Objekt mit Skalierung height, Drehung und Position wie in ModelStage; ein Punkt in lokalen (normierten) Koordinaten
    const object = new THREE.Group();
    object.position.set(origin.x, origin.y, origin.z);
    object.rotation.y = rotation;
    object.scale.setScalar(placement.height_m);
    object.updateMatrixWorld(true);
    const n = { x: 0.3, y: 0.7, z: -0.5 };
    const expected = object.localToWorld(new THREE.Vector3(n.x, n.y, n.z));
    const actual = normalizedToWorld(n, origin, rotation, placement.height_m);
    expect(actual.x).toBeCloseTo(expected.x, 9);
    expect(actual.y).toBeCloseTo(expected.y, 9);
    expect(actual.z).toBeCloseTo(expected.z, 9);
  });

  test('Startdrehung dreht im Uhrzeigersinn: Vorderseite (+Z) wandert nach links, wenn rotation_deg 90 ist', () => {
    const origin = { x: 0, y: 0, z: 0 };
    const front = normalizedToWorld({ x: 0, y: 0, z: 1 }, origin, modelRotationY(90), 1);
    expect(front.x).toBeCloseTo(-1, 9);
    expect(front.z).toBeCloseTo(0, 9);
  });

  test('clampNormalized begrenzt und rundet', () => {
    expect(clampNormalized({ x: 3, y: -1, z: -2 })).toEqual({ x: 1, y: 0, z: -1 });
    expect(clampNormalized({ x: 0.123456, y: 2, z: 0 })).toEqual({ x: 0.1235, y: 1.5, z: 0 });
  });

  test('Draufsicht: Rundreise Position ↔ Punkt, Begrenzung des Abstands', () => {
    const point = placementToTopView(90, 10, 4);
    expect(point.x).toBeCloseTo(40, 9);
    expect(point.y).toBeCloseTo(0, 9);
    expect(topViewToPlacement(point.x, point.y, 4, 1, 50)).toEqual({ yaw: 90, distance_m: 10 });
    expect(topViewToPlacement(0, -400, 4, 1, 50)).toEqual({ yaw: 0, distance_m: 50 });
    expect(topViewToPlacement(0, 0, 4, 1, 50)).toEqual({ yaw: 0, distance_m: 1 });
    expect(topViewToPlacement(-8, 8, 4, 1, 50).yaw).toBe(-135);
  });
});

describe('GLB-Header', () => {
  const header = (magic: number, version: number, length: number) => {
    const buf = new ArrayBuffer(12);
    const view = new DataView(buf);
    view.setUint32(0, magic, true);
    view.setUint32(4, version, true);
    view.setUint32(8, length, true);
    return buf;
  };
  const GLTF = 0x46546c67;

  test('gültig, falsches Magic, falsche Version, falsche Länge, zu kurz', () => {
    expect(checkGlbHeader(header(GLTF, 2, 1000), 1000)).toEqual({ ok: true });
    expect(checkGlbHeader(header(0x12345678, 2, 1000), 1000)).toEqual({ ok: false, reason: 'magic' });
    expect(checkGlbHeader(header(GLTF, 1, 1000), 1000)).toEqual({ ok: false, reason: 'version' });
    expect(checkGlbHeader(header(GLTF, 2, 999), 1000)).toEqual({ ok: false, reason: 'length' });
    expect(checkGlbHeader(new ArrayBuffer(4), 4)).toEqual({ ok: false, reason: 'magic' });
  });
});
