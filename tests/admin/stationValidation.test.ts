/// <reference types="vitest" />
import { describe, test, expect } from 'vitest';
import { validateStationDraft } from '../../src/components/StationAdminPanel/stationValidation';
import type { DraftModule } from '../../src/stationModules/meta';
import type { CustomPath } from '../../src/services/api';

// Schlüssel als Text zurückgeben, Platzhalter mit anhängen
const t = (key: string, params?: Record<string, string | number>) => (params ? `${key} ${JSON.stringify(params)}` : key);

const paths = [{ id: 'p1' }] as unknown as CustomPath[];

const story = (id: string): DraftModule => ({ id, type: 'story', title_de: 'T', title_en: null, style: 'text', text_de: 'Text', text_en: null, image: null, quote_source: null });
const panorama = (id: string): DraftModule => ({ id, type: 'ar_panorama', title_de: 'AR', title_en: null, background: 'camera', panorama_image: null, slides: [], questions: [] } as unknown as DraftModule);

function validate(modules: DraftModule[]) {
  return validateStationDraft(
    {
      pathId: 'p1',
      titleDe: 'Titel',
      descriptionDe: 'Kurz',
      longDescriptionDe: 'Lang',
      points: '10',
      cover: { kind: 'existing', filename: 'a.jpg', url: '/a.jpg' },
      modules,
    },
    { paths, lat: 48.1, lng: 8.3, t }
  );
}

describe('validateStationDraft', () => {
  test('ohne Module: Hinweis auf fehlende Module', () => {
    expect(validate([]).base.modules).toBe('adminErrorNoModules');
  });

  test('13 Module → Fehler', () => {
    const modules = Array.from({ length: 13 }, (_, i) => story(`m-${i}`));
    expect(validate(modules).base.modules).toContain('stationPreviewErrorTooManyModules');
  });

  test('zwei ar_panorama → Singleton-Fehler', () => {
    expect(validate([panorama('a'), panorama('b')]).base.modules).toContain('stationPreviewErrorSingleton');
  });

  test('unbekannter Typ stürzt nicht ab', () => {
    const unknown = { id: 'x', type: 'zukunft' } as unknown as DraftModule;
    expect(() => validate([unknown])).not.toThrow();
    expect(validate([unknown]).modules).toEqual({});
  });
});
