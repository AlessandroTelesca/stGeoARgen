/// <reference types="vitest" />
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MODULE_META, STATION_TEMPLATES, modulesFromTemplate, type DraftModuleOfType } from '../../src/stationModules/meta';
import { beforeAfterEditor } from '../../src/stationModules/editor/BeforeAfterEditor';
import { arPanoramaEditor } from '../../src/stationModules/editor/ArPanoramaEditor';
import { HeadingField, validateHeading } from '../../src/stationModules/editor/HeadingField';
import { CompassGuide, guidanceFor } from '../../src/stationModules/player/modules/CompassGuide';
import { buildPanoramaContent } from '../../src/stationModules/player/modules/panoramaContent';
import type { ModuleOfType } from '../../src/stationModules/types';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const image = { kind: 'existing' as const, filename: 'a.jpg', url: '/a.jpg' };
type BeforeAfter = DraftModuleOfType<'before_after'>;
const beforeAfter = (overrides: Partial<BeforeAfter> = {}): BeforeAfter => ({
  ...(MODULE_META.before_after.presets[0].create() as BeforeAfter),
  before_image: image,
  after_image: image,
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete (DeviceOrientationEvent as { requestPermission?: unknown }).requestPermission;
});

describe('Vorlagen: Kompass standardmäßig aus', () => {
  test('Zeitreise und AR-Rundumblick starten ohne Richtung', () => {
    for (const id of ['time_travel', 'ar_look_around']) {
      const template = STATION_TEMPLATES.find((tpl) => tpl.id === id)!;
      const modules = modulesFromTemplate(template).filter((m) => m.type === 'before_after' || m.type === 'ar_panorama');
      expect(modules).toHaveLength(1);
      expect((modules[0] as { heading?: number | null }).heading).toBeNull();
    }
  });
});

describe('Kompassrichtung prüfen', () => {
  test('aus (null/fehlt) und gültige Werte sind ok', () => {
    expect(validateHeading(null, t)).toBeUndefined();
    expect(validateHeading(undefined, t)).toBeUndefined();
    expect(validateHeading(0, t)).toBeUndefined();
    expect(validateHeading(359.9, t)).toBeUndefined();
  });

  test('leer (NaN) oder außerhalb 0–359 ist ein Fehler', () => {
    expect(validateHeading(Number.NaN, t)).toBe('compassErrorRange');
    expect(validateHeading(359.95, t)).toBe('compassErrorRange');
    expect(validateHeading(360, t)).toBe('compassErrorRange');
    expect(validateHeading(-1, t)).toBe('compassErrorRange');
  });

  test('Vorher/Nachher: Fehler und Kurzangabe', () => {
    expect(beforeAfterEditor.validate(beforeAfter({ heading: 45 }), t)).toEqual({});
    expect(beforeAfterEditor.validate(beforeAfter({ heading: Number.NaN }), t).heading).toBe('compassErrorRange');
    expect(beforeAfterEditor.summary(beforeAfter({ heading: 45 }), t)).toBe('moduleEditorMode_slider · compassSummary:{"dir":"compassDir_NE"}');
    expect(beforeAfterEditor.summary(beforeAfter({ heading: null }), t)).toBe('moduleEditorMode_slider');
  });

  test('AR-Rundumblick: Fehler und Kurzangabe', () => {
    const base = MODULE_META.ar_panorama.presets[0].create() as DraftModuleOfType<'ar_panorama'>;
    const question = { ...base.questions[0], question_de: 'Frage?', options_de: ['a', 'b', 'c', 'd'] };
    const module = { ...base, questions: [question] };
    expect(arPanoramaEditor.validate({ ...module, heading: 270 }, t)).toEqual({});
    expect(arPanoramaEditor.validate({ ...module, heading: 400 }, t).heading).toBe('compassErrorRange');
    expect(arPanoramaEditor.summary({ ...module, heading: 270 }, t)).toContain('compassSummary:{"dir":"compassDir_W"}');
  });
});

describe('HeadingField', () => {
  test('einschalten setzt Norden, Himmelsrichtung setzt Grad, ausschalten setzt null', () => {
    const onChange = vi.fn();
    const { rerender } = render(<HeadingField id="m" hint="Hinweis" value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Mit Himmelsrichtung' }));
    expect(onChange).toHaveBeenLastCalledWith(0);

    rerender(<HeadingField id="m" hint="Hinweis" value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Osten' }));
    expect(onChange).toHaveBeenLastCalledWith(90);

    rerender(<HeadingField id="m" hint="Hinweis" value={90} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Osten' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Kompass: 90° (O)' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Richtung in Grad'), { target: { value: '' } });
    expect(Number.isNaN(onChange.mock.lastCall?.[0])).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: 'Ohne Kompass' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('CompassGuide', () => {
  test('guidanceFor', () => {
    expect(guidanceFor(0)).toBe('on-target');
    expect(guidanceFor(-15)).toBe('on-target');
    expect(guidanceFor(40)).toBe('right');
    expect(guidanceFor(-40)).toBe('left');
    expect(guidanceFor(170)).toBe('around');
  });

  function compassEvent(heading: number) {
    const event = new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 90, gamma: 0 });
    Object.defineProperty(event, 'webkitCompassHeading', { value: heading });
    return event;
  }

  test('ohne Messwert: Satz mit Himmelsrichtung, nach Wartezeit ohne Suchhinweis', () => {
    vi.useFakeTimers();
    render(<CompassGuide heading={45} />);
    expect(screen.getByText(/Das Foto wurde mit Blick nach Nordosten aufgenommen \(45°\)\./)).toBeInTheDocument();
    expect(screen.getByText('Kompass wird gesucht …')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3500));
    expect(screen.queryByText('Kompass wird gesucht …')).not.toBeInTheDocument();
  });

  test('mit Messwerten: links/rechts und getroffen', () => {
    render(<CompassGuide heading={90} />);
    act(() => { window.dispatchEvent(compassEvent(30)); });
    expect(screen.getByText('Dreh dich nach rechts')).toBeInTheDocument();
    expect(screen.getByText('Ziel: O (90°)')).toBeInTheDocument();
    // Glättung: mehrere Messwerte, bis die Anzeige nachgezogen hat
    act(() => { for (let i = 0; i < 40; i++) window.dispatchEvent(compassEvent(150)); });
    expect(screen.getByText('Dreh dich nach links')).toBeInTheDocument();
    act(() => { for (let i = 0; i < 40; i++) window.dispatchEvent(compassEvent(95)); });
    expect(screen.getByText('Genau hier! So wurde das Foto aufgenommen.')).toBeInTheDocument();
  });

  test('iOS: Button holt die Freigabe und startet den Kompass', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    (DeviceOrientationEvent as { requestPermission?: unknown }).requestPermission = requestPermission;
    render(<CompassGuide heading={0} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Kompass einschalten' })); });
    expect(requestPermission).toHaveBeenCalled();
    expect(screen.getByText('Kompass wird gesucht …')).toBeInTheDocument();
    act(() => { window.dispatchEvent(compassEvent(180)); });
    expect(screen.getByText('Dreh dich um')).toBeInTheDocument();
  });
});

describe('AR-Rundumblick: Richtung geht an die Handy-Ansicht', () => {
  test('buildPanoramaContent übernimmt heading, Altdaten ohne Feld → null', () => {
    const module = { ...(MODULE_META.ar_panorama.presets[0].create() as object), heading: 120 } as unknown as ModuleOfType<'ar_panorama', string>;
    expect(buildPanoramaContent(module, 'de').heading).toBe(120);
    const legacy = { ...module } as Partial<typeof module>;
    delete legacy.heading;
    expect(buildPanoramaContent(legacy as typeof module, 'de').heading).toBeNull();
  });
});
