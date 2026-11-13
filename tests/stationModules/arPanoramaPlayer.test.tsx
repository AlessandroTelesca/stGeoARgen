/// <reference types="vitest" />
import { describe, test, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import * as THREE from 'three';
import { createPanoramaSphere } from '../../src/ar/panoramaSphere';
import { wrapDeg } from '../../src/ar/angles';
import { AR_STAGES } from '../../src/stationModules/player/arStages';
import { ArPanoramaPlaceholder } from '../../src/stationModules/player/ArPanoramaStage';
import { panelStageYaw, panelStartYaw } from '../../src/stationModules/player/modules/panoramaLayout';
import { GyroARVisualizer } from '../../src/ARbackend/GyroARVisualizer';
import { buildPanoramaContent } from '../../src/stationModules/player/modules/panoramaContent';
import { PANEL_YAWS_DEG, panoramaPanelWidth } from '../../src/components/ARComponents/customPanorama/PanoramaPanels';
import { usePanoramaQuiz } from '../../src/components/ARComponents/customPanorama/usePanoramaQuiz';
import type { StationModule } from '../../src/stationModules/types';

/** Yaw des Äquator-Vertex zur Bildspalte u (Konvention des AR-Kerns: yaw = atan2(x, −z)) */
function equatorYaw(mesh: THREE.Mesh, u: number): number {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const uv = geometry.getAttribute('uv');
  const pos = geometry.getAttribute('position');
  mesh.updateMatrixWorld(true);
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(uv.getX(i) - u) < 1e-9 && Math.abs(pos.getY(i)) < 1e-6) {
      const w = mesh.localToWorld(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
      return (Math.atan2(w.x, -w.z) * 180) / Math.PI;
    }
  }
  throw new Error(`kein Äquator-Vertex für u=${u}`);
}

describe('ar_panorama: Plätze der Tafeln', () => {
  /** Hintergrund-Kugel, die GyroARVisualizer.setPanoramaBackground anlegt (ohne Renderer/Sensoren) */
  function gyroBackdrop(options?: { correctOrientation?: boolean }): THREE.Mesh {
    const viz = Object.create(GyroARVisualizer.prototype) as GyroARVisualizer & { scene: THREE.Scene };
    viz.scene = new THREE.Scene();
    viz.setPanoramaBackground(new THREE.Texture(), options);
    return viz.scene.getObjectByName('PanoramaBackdrop') as THREE.Mesh;
  }

  test('Handy-Rundumblick nutzt dieselbe, nicht gespiegelte Kugel wie der Desktop-Player', () => {
    const phone = gyroBackdrop({ correctOrientation: true });
    const stage = createPanoramaSphere(new THREE.Texture());
    for (const u of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
      expect(wrapDeg(equatorYaw(phone, u) - equatorYaw(stage, u))).toBeCloseTo(0, 5);
    }
    // Bildmitte vorn, Bild wächst nach rechts (nicht seitenverkehrt)
    expect(wrapDeg(equatorYaw(phone, 0.5))).toBeCloseTo(0, 5);
    expect(wrapDeg(equatorYaw(phone, 0.75))).toBeCloseTo(90, 5);
  });

  test('fest eingebaute Stationen behalten die bisherige Kugel (u = 0,75 vorn)', () => {
    const legacy = gyroBackdrop();
    expect(wrapDeg(equatorYaw(legacy, 0.75))).toBeCloseTo(0, 5);
    expect(wrapDeg(equatorYaw(legacy, 0.5))).toBeCloseTo(90, 5);
  });

  test('Tafeln im Uhrzeigersinn ab dem Startblick, Start auf der ersten Tafel', () => {
    expect([0, 1, 2].map((slot) => panelStageYaw(slot))).toEqual([0, 36, 72]);
    expect(panelStageYaw(5)).toBeCloseTo(180);
    expect(panelStageYaw(6)).toBeCloseTo(-144);
    expect(panelStartYaw()).toBe(0);
  });

  test('zehn Plätze, gleichmäßig im Abstand von 36 Grad', () => {
    expect(PANEL_YAWS_DEG).toHaveLength(10);
    for (let i = 1; i < PANEL_YAWS_DEG.length; i++) expect(PANEL_YAWS_DEG[i] - PANEL_YAWS_DEG[i - 1]).toBe(36);
  });

  test('Panelbreite bleibt zwischen Minimum und Maximum und passt in schmale Rahmen', () => {
    expect(panoramaPanelWidth(1000, 1000)).toBe(440);
    expect(panoramaPanelWidth(1000, 10)).toBe(260);
    expect(panoramaPanelWidth(280, 1000)).toBe(240);
  });
});

describe('ar_panorama: Bühne', () => {
  test('Preview ist der Player auf dem AR-Kern, nicht mehr der Platzhalter', () => {
    const stage = AR_STAGES.ar_panorama!;
    expect(stage.Preview).toBeDefined();
    expect(stage.Preview).not.toBe(ArPanoramaPlaceholder);
    expect(stage.Native).toBeDefined();
  });

  test('Inhalte in der gewählten Sprache', () => {
    const module = {
      id: 'm',
      type: 'ar_panorama',
      title_de: null,
      title_en: null,
      background: 'camera',
      panorama_image: 'pano.jpg',
      slides: [{ image: 'a.jpg', text_de: 'Hallo', text_en: 'Hello' }],
      questions: [{ question_de: 'Frage?', question_en: 'Question?', options_de: ['A', 'B'], options_en: ['C', 'D'], correct_answer: 1, image: null }],
    } as unknown as Extract<StationModule<string>, { type: 'ar_panorama' }>;
    const de = buildPanoramaContent(module, 'de');
    expect(de.panoramaUrl).toBeNull();
    expect(de.slides).toEqual([{ imageUrl: 'a.jpg', text: 'Hallo' }]);
    expect(de.questions[0]).toEqual({ question: 'Frage?', options: ['A', 'B'], correctAnswer: 1, imageUrl: undefined });
    const en = buildPanoramaContent({ ...module, background: 'panorama' }, 'en');
    expect(en.panoramaUrl).toBe('pano.jpg');
    expect(en.questions[0].options).toEqual(['C', 'D']);
  });
});

describe('usePanoramaQuiz', () => {
  const questions = [
    { question: 'F1', options: ['a', 'b', 'c'], correctAnswer: 2 },
    { question: 'F2', options: ['a', 'b'], correctAnswer: 0 },
  ];

  test('falsche Antwort wird gemerkt, richtige beendet die Frage, am Ende folgt die Auswertung', () => {
    const { result } = renderHook(() => usePanoramaQuiz(questions));
    expect(result.current.phase).toBe('question');

    act(() => result.current.handleAnswer(0));
    expect(result.current.wrongSelections[0]).toEqual([0]);
    expect(result.current.phase).toBe('question');
    act(() => result.current.handleAnswer(0)); // gesperrt
    expect(result.current.wrongSelections[0]).toEqual([0]);

    act(() => result.current.handleAnswer(2));
    expect(result.current.phase).toBe('feedback');
    expect(result.current.correctSelection).toBe(2);

    act(() => result.current.handleContinue());
    expect(result.current.questionIndex).toBe(1);
    expect(result.current.phase).toBe('question');
    expect(result.current.correctSelection).toBeNull();

    act(() => result.current.handleAnswer(0));
    act(() => result.current.handleContinue());
    expect(result.current.phase).toBe('summary');
    expect(result.current.firstTryCorrect).toBe(1);
  });
});
