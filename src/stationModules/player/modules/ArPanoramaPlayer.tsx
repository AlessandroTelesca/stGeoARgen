import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { dirFromYawPitch } from '../../../ar/angles';
import { DragInput } from '../../../ar/inputs';
import { useArStage } from '../../../ar/useArStage';
import {
  PANEL_YAWS_DEG,
  PANEL_WIDTH_VAR,
  panoramaAnchorStyle,
  PanoramaQuizPanel,
  PanoramaSlidePanel,
  panoramaPanelWidth,
  QUIZ_UI_SAFE_VERTICAL_GAP,
} from '../../../components/ARComponents/customPanorama/PanoramaPanels';
import { usePanoramaQuiz } from '../../../components/ARComponents/customPanorama/usePanoramaQuiz';
import type { ModuleOfType } from '../../types';
import { ArPanoramaPlaceholder } from '../ArPanoramaStage';
import { Feedback, PrimaryButton } from '../ui';
import { buildPanoramaContent } from './panoramaContent';
import { panelStageYaw, panelStartYaw } from './panoramaLayout';

/** Dauer des Hinweises „Ziehen zum Umsehen“ */
const DRAG_HINT_MS = 4000;
/** Abstand der Tafeln zur Kamera (die Pixelposition hängt nur von der Richtung ab) */
const PANEL_DISTANCE = 10;
/** Blickbewegung in Grad, ab der der Hinweis verschwindet */
const MOVED_DEG = 3;
/** 1 % der Containerhöhe als CSS-Länge: ersetzt vh im (skalierten) Admin-Rahmen */
const PANORAMA_VH_VAR = '--panorama-vh';
const vh = (percent: number) => `calc(${percent} * var(${PANORAMA_VH_VAR}, 1vh))`;
const PANORAMA_VH_CALC_100 = `100 * var(${PANORAMA_VH_VAR}, 1vh)`;

const pillClass = 'rounded-full bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur';

export interface ArPanoramaPlayerProps {
  module: ModuleOfType<'ar_panorama', string>;
  lang: 'de' | 'en';
  continueLabel: string;
  onContinue: () => void;
}

/**
 * AR-Rundumblick am Rechner und in der Vorschau der Stationsverwaltung: 360°-Bild (sonst neutraler
 * Hintergrund) mit den Tafeln der Station rundum, Blick per Ziehen und Pfeiltasten. Die Tafeln sind
 * dieselben Bausteine wie in der Handy-Ansicht (PanoramaPanels, usePanoramaQuiz) und hängen vor
 * derselben Bildstelle (panoramaLayout). Pro Bild läuft nur der Frame-Callback der Bühne, der die
 * Tafeln per transform setzt; React-State ändert sich nur bei Ereignissen.
 * Ohne WebGL zeigt die Bühne stattdessen den Platzhalter.
 */
export function ArPanoramaPlayer({ module, lang, continueLabel, onContinue }: ArPanoramaPlayerProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const withPanorama = module.background === 'panorama' && !!module.panorama_image;
  const withPanoramaRef = useRef(withPanorama);
  withPanoramaRef.current = withPanorama;

  const { session, status, error } = useArStage(containerRef, {
    enabled: true,
    mode: 'drag',
    autoStart: true,
    background: withPanorama ? 'panorama' : 'neutral',
    panoramaUrl: withPanorama ? module.panorama_image : null,
    reducedMotion: !!reduceMotion,
  });
  const running = status === 'running';

  const content = useMemo(() => buildPanoramaContent(module, lang), [module, lang]);
  // Ein Platz bleibt fürs Quiz; ältere Stationen mit mehr Bildern zeigen nur die ersten 9
  const slides = content.slides.slice(0, PANEL_YAWS_DEG.length - 1);
  const quizSlot = slides.length;
  const quiz = usePanoramaQuiz(content.questions);

  const [dragHint, setDragHint] = useState(true);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Start: auf die erste Tafel schauen wie am Handy (die Eingabe der Bühne beginnt bei yaw 0)
  useEffect(() => {
    if (!session) return;
    const input = new DragInput({ reducedMotion: !!reduceMotion });
    session.setInput(input);
    input.setYawPitch(panelStartYaw(withPanoramaRef.current), 0);
  }, [session]);

  // Frame-Callback: Tafeln an ihren festen Plätzen im Raum auf den Bildschirm projizieren
  useEffect(() => {
    if (!session) return;
    const world = new THREE.Vector3();
    const dirs = Array.from({ length: quizSlot + 1 }, (_, slot) => dirFromYawPitch(panelStageYaw(slot, withPanorama), 0));
    let sizeKey = '';
    let startForward: THREE.Vector3 | null = null;
    let movedReported = false;

    const off = session.onFrame((ctx) => {
      const layer = layerRef.current;
      if (!layer) return;

      // Panelbreite aus dem Blickwinkel, Höhe für die Höchstgrößen; beides aus dem Container, nicht aus dem Fenster
      const key = `${ctx.width}x${ctx.height}@${ctx.camera.fov}`;
      if (key !== sizeKey) {
        sizeKey = key;
        const focal = ctx.height / 2 / Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
        layer.style.setProperty(PANEL_WIDTH_VAR, `${Math.round(panoramaPanelWidth(ctx.width, focal))}px`);
        layer.style.setProperty(PANORAMA_VH_VAR, `${ctx.height / 100}px`);
      }

      if (!movedReported) {
        if (!startForward) startForward = ctx.forward.clone();
        else if (startForward.angleTo(ctx.forward) * (180 / Math.PI) > MOVED_DEG) {
          movedReported = true;
          setDragHint(false);
        }
      }

      for (let slot = 0; slot < dirs.length; slot++) {
        const element = panelRefs.current[slot];
        if (!element) continue;
        const pos = session.projectToContainer(world.copy(dirs[slot]).multiplyScalar(PANEL_DISTANCE));
        // Hinter der Kamera oder weit außerhalb des Bildes → ausblenden (nicht klickbar)
        if (!pos.visible || Math.abs(pos.x - ctx.width / 2) > 1.5 * ctx.width || Math.abs(pos.y - ctx.height / 2) > 1.5 * ctx.height) {
          element.style.visibility = 'hidden';
          continue;
        }
        element.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        element.style.visibility = 'visible';
      }
    });
    return off;
  }, [session, quizSlot, withPanorama]);

  // Hinweis läuft nach einigen Sekunden von selbst aus
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setDragHint(false), DRAG_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [running]);

  // Vergrößertes Bild mit Escape schließen
  useEffect(() => {
    if (!zoomedImageUrl) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomedImageUrl(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomedImageUrl]);

  // Ohne WebGL (oder anderen Startfehler außer dem Bild) den Platzhalter mit Inhaltsangabe zeigen
  if (status === 'error' && error !== 'texture-failed') {
    return <ArPanoramaPlaceholder module={module} lang={lang} continueLabel={continueLabel} onContinue={onContinue} />;
  }
  const failed = status === 'error';

  const quizEnd = quiz.totalQuestions === 0;
  const quizMaxHeight = `calc(${PANORAMA_VH_CALC_100} - ${QUIZ_UI_SAFE_VERTICAL_GAP * 2}px)`;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0 select-none bg-gradient-to-b from-gray-900 to-black">
        {!running && !failed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" role="status">
            <span className="block w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
          </div>
        )}

        {running && (
          <>
            <div ref={layerRef} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
              {slides.map((slide, index) => (
                <div key={index} ref={(el) => { panelRefs.current[index] = el; }} style={panoramaAnchorStyle}>
                  <PanoramaSlidePanel
                    slide={slide}
                    index={index}
                    total={slides.length}
                    maxHeight={quizMaxHeight}
                    imageMaxHeight={vh(34)}
                    onZoom={setZoomedImageUrl}
                  />
                </div>
              ))}

              {/* Quiz: ein weiteres Panel direkt nach dem letzten Bild */}
              <div ref={(el) => { panelRefs.current[quizSlot] = el; }} style={panoramaAnchorStyle}>
                <PanoramaQuizPanel
                  quiz={quiz}
                  isGuestMode={false}
                  embedded={{ continueLabel, onContinue }}
                  maxHeight={quizMaxHeight}
                  imageMaxHeight={vh(28)}
                  onZoom={setZoomedImageUrl}
                />
              </div>
            </div>

            {/* Unten: Hinweis zum Umsehen; ohne Fragen gibt es keine Auswertung mit Weiter-Button */}
            <div className="pointer-events-none absolute inset-x-0 z-10 px-5" style={{ bottom: 'var(--module-footer-pad, max(24px, env(safe-area-inset-bottom, 0px)))' }}>
              <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
                {dragHint && <p className={pillClass}>{t('arDiscoverDragHint')}</p>}
                {quizEnd && (
                  <div className="pointer-events-auto flex w-full">
                    <PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {failed && (
          <div className="absolute inset-0 z-10 flex flex-col justify-center gap-4 px-5">
            <Feedback tone="error" title={t('arDiscoverLoadError')} />
            <PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>
          </div>
        )}

        {zoomedImageUrl && (
          <div
            role="dialog"
            aria-modal="true"
            data-ar-nodrag
            onClick={() => setZoomedImageUrl(null)}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-3"
            style={{ cursor: 'zoom-out' }}
          >
            <img src={zoomedImageUrl} alt="" draggable={false} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
            <button
              type="button"
              aria-label={t('close')}
              onClick={() => setZoomedImageUrl(null)}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/60 text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
