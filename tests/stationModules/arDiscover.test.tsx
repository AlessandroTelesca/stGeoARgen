/// <reference types="vitest" />
import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { mapModuleMedia, MODULE_TYPES, type StationModule } from '../../src/stationModules/types';
import { MODULE_META, MODULE_ORDER, STATION_TEMPLATES, isArModuleType, modulesFromTemplate, type DraftModule } from '../../src/stationModules/meta';
import { moduleMissingContent, moduleStructureKey } from '../../src/stationModules/player/previewSupport';
import { arDiscoverEditor } from '../../src/stationModules/editor/ArDiscoverEditor';
import { PanoramaPointCanvas } from '../../src/stationModules/editor/PanoramaPointCanvas';
import { clampPitch, equirectToYawPitch, wrapDeg, yawPitchToEquirect } from '../../src/stationModules/editor/arDiscoverGeometry';
import * as arAngles from '../../src/ar/angles';
import { GAZE_RADIUS } from '../../src/ar/gaze';
import { POINT_RADIUS_DEG } from '../../src/stationModules/editor/arDiscoverGeometry';
import { translations } from '../../src/i18n/translations';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const point = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  yaw: 10,
  pitch: 5,
  size: 'medium' as const,
  title_de: 'Tor',
  title_en: null,
  text_de: 'Text',
  text_en: null,
  image: null,
  ...overrides,
});

const discover = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'm-1',
    type: 'ar_discover',
    title_de: null,
    title_en: null,
    background: 'panorama',
    panorama_image: 'pano.jpg',
    intro_de: 'Hallo',
    intro_en: null,
    require_all: false,
    points: [point(), point({ id: 'p-2', image: 'bild.jpg' })],
    ...overrides,
  }) as unknown as StationModule<string>;

describe('ar_discover: Registrierung', () => {
  test('Typ, Meta, Reihenfolge und Vorlage', () => {
    expect(MODULE_TYPES).toContain('ar_discover');
    expect(MODULE_META.ar_discover.immersive).toBe(true);
    expect(MODULE_META.ar_discover.singleton).toBeUndefined();
    expect(MODULE_ORDER.indexOf('ar_discover')).toBe(MODULE_ORDER.indexOf('ar_panorama') + 1);
    expect(MODULE_META.ar_discover.presets.map((p) => p.id)).toEqual(['panorama', 'camera']);
    const template = STATION_TEMPLATES.find((tpl) => tpl.id === 'discover')!;
    expect(modulesFromTemplate(template).map((m) => m.type)).toEqual(['ar_discover', 'quiz']);
  });

  test('isArModuleType', () => {
    expect(isArModuleType('ar_panorama')).toBe(true);
    expect(isArModuleType('ar_discover')).toBe(true);
    expect(isArModuleType('quiz')).toBe(false);
  });

  test('i18n: DE und EN haben dieselben Schlüssel, alle Texte der Metadaten sind vorhanden', () => {
    const keys = (lang: 'de' | 'en') => Object.keys(translations[lang]).filter((k) => k.startsWith('arDiscover')).sort();
    expect(keys('de')).toEqual(keys('en'));
    const meta = MODULE_META.ar_discover;
    for (const key of [meta.labelKey, meta.descriptionKey, ...meta.presets.flatMap((p) => [p.labelKey, p.descriptionKey])]) {
      expect((translations.de as Record<string, string>)[key]).toBeTruthy();
      expect((translations.en as Record<string, string>)[key]).toBeTruthy();
    }
  });
});

describe('ar_discover: mapModuleMedia', () => {
  test('Panorama als Art "panorama", Punktbilder als "image", leere Felder bleiben null', () => {
    const calls: [string, string][] = [];
    const mapped = mapModuleMedia(discover({ points: [point({ image: 'a.jpg' }), point({ id: 'p-2' })] }), (media, kind) => {
      calls.push([media, kind]);
      return `url:${media}`;
    });
    expect(calls).toEqual([['pano.jpg', 'panorama'], ['a.jpg', 'image']]);
    expect(mapped.type === 'ar_discover' && mapped.panorama_image).toBe('url:pano.jpg');
    expect(mapped.type === 'ar_discover' && mapped.points.map((p) => p.image)).toEqual(['url:a.jpg', null]);
  });
});

describe('ar_discover: Vorschau', () => {
  test('Punktverschiebung und Texte ändern den Schlüssel nicht, Hintergrund und Kennung schon', () => {
    const base = moduleStructureKey(discover());
    expect(moduleStructureKey(discover({ points: [point({ yaw: 99, pitch: -20, title_de: 'Anders' }), point({ id: 'p-2' }), point({ id: 'p-3' })] }))).toBe(base);
    expect(moduleStructureKey(discover({ background: 'camera' }))).not.toBe(base);
    expect(moduleStructureKey(discover({ id: 'm-2' }))).not.toBe(base);
  });

  test('fehlende Inhalte: keine Punkte oder Panorama ohne Bild', () => {
    expect(moduleMissingContent(discover())).toBe(false);
    expect(moduleMissingContent(discover({ points: [] }))).toBe(true);
    expect(moduleMissingContent(discover({ panorama_image: '' }))).toBe(true);
    expect(moduleMissingContent(discover({ background: 'camera', panorama_image: null }))).toBe(false);
  });
});

describe('ar_discover: Editor-Prüfung', () => {
  const draft = (overrides: Record<string, unknown> = {}) =>
    ({ ...(discover({ panorama_image: { kind: 'existing', filename: 'p.jpg', url: 'u' } }) as object), ...overrides }) as unknown as Extract<DraftModule, { type: 'ar_discover' }>;

  test('gültiges Modul ohne Fehler', () => {
    expect(arDiscoverEditor.validate(draft(), t)).toEqual({});
  });

  test('0 Punkte', () => {
    expect(arDiscoverEditor.validate(draft({ points: [] }), t)).toEqual({ points: 'arDiscoverErrorPoints' });
  });

  test('Panorama ohne Bild; Kamera braucht keins', () => {
    expect(arDiscoverEditor.validate(draft({ panorama_image: null }), t).panorama_image).toBeTruthy();
    expect(arDiscoverEditor.validate(draft({ background: 'camera', panorama_image: null }), t)).toEqual({});
  });

  test('Punkt ohne Titel oder Text (DE)', () => {
    const errors = arDiscoverEditor.validate(draft({ points: [point({ title_de: ' ' }), point({ id: 'p-2', text_de: '' })] }), t);
    expect(Object.keys(errors).sort()).toEqual(['points.0.title_de', 'points.1.text_de']);
  });

  test('Kurzangabe', () => {
    expect(arDiscoverEditor.summary(draft(), t)).toContain('arDiscoverSummary_panorama');
  });
});

describe('PanoramaPointCanvas', () => {
  const rect = { left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0, toJSON: () => ({}) };

  test('Klick auf die Fläche: u=0.75, v=0.5 → yaw 90, pitch 0', () => {
    const onAdd = vi.fn();
    render(<PanoramaPointCanvas imageUrl={null} points={[]} selectedId={null} onSelect={vi.fn()} onAdd={onAdd} onMove={vi.fn()} />);
    const area = screen.getByRole('group');
    area.getBoundingClientRect = () => rect as DOMRect;
    fireEvent.click(area, { clientX: 300, clientY: 100 });
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(90, 0);
  });

  test('Klick auf einen Punkt wählt ihn aus und legt keinen neuen an; Pfeiltasten verschieben ihn', () => {
    const onAdd = vi.fn();
    const onSelect = vi.fn();
    const onMove = vi.fn();
    render(<PanoramaPointCanvas imageUrl={null} points={[{ id: 'p-1', yaw: 179.5, pitch: 84.5, size: 'medium' }]} selectedId="p-1" onSelect={onSelect} onAdd={onAdd} onMove={onMove} />);
    const area = screen.getByRole('group');
    fireEvent.click(screen.getByRole('button', { pressed: true }));
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.keyDown(area, { key: 'ArrowRight' });
    expect(onMove).toHaveBeenLastCalledWith('p-1', -179.5, 84.5); // yaw wrappt bei ±180
    fireEvent.keyDown(area, { key: 'ArrowUp', shiftKey: true });
    expect(onMove).toHaveBeenLastCalledWith('p-1', 179.5, 85); // pitch wird begrenzt
  });
});

describe('arDiscoverGeometry entspricht src/ar', () => {
  test('Winkelfunktionen und Trefferradien stimmen überein', () => {
    for (const deg of [-541, -180, -90.5, 0, 90, 180, 359.9, 720]) expect(wrapDeg(deg)).toBeCloseTo(arAngles.wrapDeg(deg), 9);
    for (const p of [-100, -85, 0, 42, 90]) expect(clampPitch(p)).toBe(arAngles.clampPitch(p));
    for (const [u, v] of [[0, 0], [0.25, 0.3], [0.5, 0.5], [0.75, 1], [1, 0.5]]) {
      expect(equirectToYawPitch(u, v)).toEqual(arAngles.equirectToYawPitch(u, v));
    }
    expect(yawPitchToEquirect(-120, 30)).toEqual(arAngles.yawPitchToEquirect(-120, 30));
    expect(POINT_RADIUS_DEG).toEqual(GAZE_RADIUS);
  });
});
