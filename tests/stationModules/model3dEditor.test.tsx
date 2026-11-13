/// <reference types="vitest" />
import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DraftModuleOfType } from '../../src/stationModules/meta';
import { MODULE_META } from '../../src/stationModules/meta';
import { model3dEditor } from '../../src/stationModules/editor/Model3dEditor';
import { ModelTopView, topViewRange } from '../../src/stationModules/editor/ModelTopView';
import { MediaField } from '../../src/stationModules/editor/fields';

// Keine WebGL-Bühne im Test: die Vorschau ist ein Platzhalter, der die Kennzahlen meldet
vi.mock('../../src/stationModules/editor/ModelStagePreview', () => ({
  ModelStagePreview: ({ modelUrl, onStats }: { modelUrl: string; onStats: (s: { triangles: number; maxTextureSize: number }) => void }) => (
    <button type="button" data-testid="stage-preview" onClick={() => onStats({ triangles: 450000, maxTextureSize: 2048 })}>
      {modelUrl}
    </button>
  ),
}));

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

type Module = DraftModuleOfType<'model3d'>;
const created = MODULE_META.model3d.presets[0].create() as Module;
const file = new File(['glb'], 'tor.glb', { type: 'model/gltf-binary' });
const model = { kind: 'new' as const, file, url: 'blob:tor' };
const module = (overrides: Partial<Module> = {}): Module => ({ ...created, model, ...overrides });
const point = (overrides = {}) => ({ id: 'p-1', x: 0.1, y: 0.5, z: 0, title_de: 'Tor', title_en: null, text_de: 'Text', text_en: null, image: null, ...overrides });

describe('model3d: Prüfung und Kurzangabe', () => {
  test('gültiges Modul hat keine Fehler', () => {
    expect(model3dEditor.validate(module(), t)).toEqual({});
  });

  test('Modell fehlt', () => {
    expect(model3dEditor.validate(module({ model: null }), t).model).toBe('model3dErrorModel');
  });

  test('Panorama braucht ein Bild, Kamera nicht', () => {
    expect(model3dEditor.validate(module({ background: 'panorama', panorama_image: null }), t).panorama_image).toBe('moduleErrorPanoramaRequired');
    expect(model3dEditor.validate(module({ background: 'camera', panorama_image: null }), t).panorama_image).toBeUndefined();
  });

  test('Zahlen außerhalb der Bereiche', () => {
    const errors = model3dEditor.validate(module({ height_m: 0, distance_m: 51, elevation_m: -4, yaw: 181, rotation_deg: 360 }), t);
    expect(Object.keys(errors).sort()).toEqual(['distance_m', 'elevation_m', 'height_m', 'rotation_deg', 'yaw']);
    expect(errors.height_m).toContain('model3dErrorRange');
    expect(model3dEditor.validate(module({ height_m: Number.NaN }), t).height_m).toBeDefined();
    expect(model3dEditor.validate(module({ height_m: 0.1, distance_m: 1, elevation_m: 20, yaw: -180, rotation_deg: 0 }), t)).toEqual({});
  });

  test('Infopunkt ohne Titel oder Text (DE)', () => {
    const errors = model3dEditor.validate(module({ info_points: [point(), point({ id: 'p-2', title_de: ' ', text_de: '' })] }), t);
    expect(errors).toEqual({ 'info_points.1.title_de': 'moduleErrorRequired', 'info_points.1.text_de': 'moduleErrorRequired' });
  });

  test('summary: Hintergrund, Höhe, Infopunkte (Einzahl/Mehrzahl)', () => {
    expect(model3dEditor.summary(module({ height_m: 2 }), t)).toBe('model3dSummary_camera · model3dSummaryHeight:{"value":"2"}');
    expect(model3dEditor.summary(module({ background: 'panorama', info_points: [point()] }), t)).toContain('model3dSummaryPointsOne:{"count":1}');
    expect(model3dEditor.summary(module({ info_points: [point(), point({ id: 'p-2' })] }), t)).toContain('model3dSummaryPointsOther:{"count":2}');
  });
});

describe('ModelTopView', () => {
  const rect = { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) };

  function setup(props: Partial<Parameters<typeof ModelTopView>[0]> = {}) {
    const onChange = vi.fn();
    render(<ModelTopView yaw={0} distance_m={5} height_m={2} rotation_deg={0} onChange={onChange} {...props} />);
    const view = screen.getByRole('application');
    view.getBoundingClientRect = () => rect as DOMRect;
    return { view, onChange };
  }

  test('Reichweite wächst stufenweise mit Abstand und Höhe', () => {
    expect(topViewRange(5, 2)).toBe(10);
    expect(topViewRange(10, 2)).toBe(20);
    expect(topViewRange(30, 5)).toBe(50);
    expect(topViewRange(50, 50)).toBe(50);
  });

  test('ist fokussierbar und beschriftet', () => {
    const { view } = setup();
    expect(view.getAttribute('tabindex')).toBe('0');
    expect(view.getAttribute('aria-label')).toBeTruthy();
  });

  test('Ziehen nach rechts der Mitte: yaw 90, Abstand wie der Zeigerabstand', () => {
    // Reichweite 10 m → 4,4 Einheiten je Meter; Mitte der Fläche = (50, 50)
    const { view, onChange } = setup();
    fireEvent.pointerDown(view, { clientX: 50 + 22, clientY: 50, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(90, 5);
    fireEvent.pointerMove(view, { clientX: 50, clientY: 50 - 8.8, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(0, 2);
    fireEvent.pointerUp(view, { pointerId: 1 });
    onChange.mockClear();
    fireEvent.pointerMove(view, { clientX: 70, clientY: 50, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('Abstand bleibt zwischen 1 und 50 m', () => {
    const { view, onChange } = setup();
    fireEvent.pointerDown(view, { clientX: 50, clientY: 50, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(0, 1);
  });

  test('Pfeiltasten: links/rechts Richtung ∓5°, hoch/runter Abstand ±0,5 m', () => {
    const { view, onChange } = setup({ yaw: 177 });
    fireEvent.keyDown(view, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(-178, 5);
    fireEvent.keyDown(view, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(172, 5);
    fireEvent.keyDown(view, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(177, 5.5);
    fireEvent.keyDown(view, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(177, 4.5);
    onChange.mockClear();
    fireEvent.keyDown(view, { key: 'a' });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('Pfeiltasten überschreiten die Grenzen nicht', () => {
    const { view, onChange } = setup({ distance_m: 50 });
    fireEvent.keyDown(view, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(0, 50);
  });
});

describe('MediaField kind model', () => {
  test('nimmt GLB an und zeigt Format, nach der Wahl Dateiname und Größe', async () => {
    const prepareMedia = vi.fn().mockResolvedValue(model);
    const onChange = vi.fn();
    const { container, rerender } = render(<MediaField label="Modell" kind="model" value={null} onChange={onChange} prepareMedia={prepareMedia} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('.glb,model/gltf-binary');
    expect(screen.getByText('GLB · max. 15 MB')).toBeTruthy();

    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(model));
    expect(prepareMedia).toHaveBeenCalledWith(file, 'model');

    rerender(<MediaField label="Modell" kind="model" value={model} onChange={onChange} prepareMedia={prepareMedia} />);
    expect(screen.getByText('tor.glb')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('Model3dEditor', () => {
  const props = { lang: 'de' as const, errors: {}, prepareMedia: vi.fn(), onChange: vi.fn() };

  test('ohne Modell keine Vorschau, mit Modell die (gestubbte) Vorschau samt Warnung bei schweren Modellen', async () => {
    const { Editor } = model3dEditor;
    const { rerender } = render(<Editor {...props} module={module({ model: null })} />);
    expect(screen.queryByTestId('stage-preview')).toBeNull();
    expect(screen.getByText('Wähle ein 3D-Modell, um es hier aufzustellen.')).toBeTruthy();

    rerender(<Editor {...props} module={module()} />);
    const preview = await screen.findByTestId('stage-preview');
    expect(preview.textContent).toBe('blob:tor');
    expect(screen.queryByText(/sehr detailliert|schwer/)).toBeNull();
    fireEvent.click(preview);
    expect(await screen.findByText(/300\.000 Dreiecke/)).toBeTruthy();
    expect(screen.getByText('450.000 Dreiecke')).toBeTruthy();
  });

  test('Höhe über Augenhöhe: „Auf den Boden“ setzt −1,6 m', () => {
    const onChange = vi.fn();
    const { Editor } = model3dEditor;
    render(<Editor {...props} onChange={onChange} module={module({ elevation_m: 2 })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Auf den Boden' }));
    const update = onChange.mock.calls[0][0] as (prev: Module) => Module;
    expect(update(module({ elevation_m: 2 })).elevation_m).toBe(-1.6);
  });
});
