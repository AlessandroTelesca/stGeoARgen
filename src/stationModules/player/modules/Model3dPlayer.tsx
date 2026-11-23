import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import { Box, RotateCcw, RotateCw } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GAZE_RADIUS, pickGazeTarget, type GazeTarget } from '../../../ar/gaze';
import { DwellTracker } from '../../../ar/dwell';
import { DragInput, pickInputMode } from '../../../ar/inputs';
import { ModelStage, type ModelStageParams } from '../../../ar/modelStage';
import { useArStage } from '../../../ar/useArStage';
import { ArEdgeHint, type ArEdgeHintHandle } from '../../../ar/ui/ArEdgeHint';
import { ArInfoSheet } from '../../../ar/ui/ArInfoSheet';
import { ArMarkerLayer, type ArMarker, type ArMarkerLayerHandle } from '../../../ar/ui/ArMarkerLayer';
import { ArReticle, type ArReticleHandle } from '../../../ar/ui/ArReticle';
import { pickLang, type ModelInfoPoint } from '../../types';
import { Feedback, GlassCard, ModuleText, PrimaryButton, type ModulePlayerProps } from '../ui';

/** Dauer der Hinweis-Pillen */
const HINT_MS = 4000;
const MOTION_HINT_MS = 6000;
/** Verdeckung der Infopunkte höchstens alle so viele ms neu prüfen */
const OCCLUSION_INTERVAL_MS = 100;
/** Marker außerhalb des Bildes (mit Rand) sind für Tastatur und Screenreader aus dem Weg */
const OFFSCREEN_MARGIN = 32;
/** Drehung beim Wischen: Grad pro Pixel; Buttons drehen um ROTATE_STEP_DEG */
const DEG_PER_PX = 0.5;
const ROTATE_STEP_DEG = 30;
/** Zeigerbewegung in Pixeln, ab der aus einem Tipp ein Wischen wird */
const SWIPE_START_PX = 4;
/** Platz für die Beschriftung über dem Modell und die Steuerung unten (Pixel) */
const LABEL_SIDE_MARGIN = 16;
const LABEL_TOP_MIN = 96;
const LABEL_BOTTOM_MARGIN = 150;
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [data-ar-nodrag]';
const RAD = Math.PI / 180;

const pillClass = 'rounded-full bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur';
const roundButtonClass =
  'pointer-events-auto flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50';

/** Daten, die die Frame-Callbacks und Zeiger-Handler lesen (aktuelle Props, ohne die Session neu aufzubauen) */
interface LiveData {
  points: ModelInfoPoint<string>[];
  seen: ReadonlySet<string>;
  paused: boolean;
  userRotate: boolean;
}

type LoadState = { status: 'loading'; progress: number } | { status: 'ready' } | { status: 'error' };

/** Fortschrittsring (wird erst gefüllt, wenn der Server die Dateigröße nennt; bis dahin dreht sich ein Bogen) */
function LoadingRing({ progress }: { progress: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const known = progress > 0;
  return (
    <svg viewBox="0 0 48 48" className={`mx-auto h-14 w-14 ${known ? '-rotate-90' : 'animate-spin'}`} aria-hidden="true">
      <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="4" className="stroke-white/25" />
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className="stroke-white"
        strokeDasharray={`${(known ? progress : 0.25) * circumference} ${circumference}`}
      />
    </svg>
  );
}

/**
 * 3D-Modell: GLB im Kamerabild oder vor einem 360°-Bild. Am Handy steuert der Lagesensor den Blick,
 * sonst Ziehen (auch in der Vorschau der Stationsverwaltung). Das Modell dreht sich per Wischen,
 * Buttons oder von selbst; Infopunkte öffnen per Laser + Verweilen oder Antippen eine Info-Karte.
 * Pro Bild läuft nur der Frame-Callback der Bühne; React-State ändert sich nur bei Ereignissen.
 */
export function Model3dPlayer({ module, lang, preview, continueLabel, onContinue }: ModulePlayerProps<'model3d'>) {
  const { t } = useLanguage();
  const reduceMotion = !!useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<ArMarkerLayerHandle>(null);
  const reticleRef = useRef<ArReticleHandle>(null);
  const edgeRef = useRef<ArEdgeHintHandle>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const [mode] = useState<'orientation' | 'drag'>(() =>
    preview
      ? 'drag'
      : pickInputMode({ preview: false, isTouch: typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches })
  );

  // Kamera-Hintergrund gibt es nur mit Lagesensor am Handy; sonst Referenzbild bzw. neutraler Hintergrund
  // Rückfall auf Ziehen (Freigabe verweigert, kein Sensor): stehendes Kamerabild passt nicht mehr zum Blick
  const [droppedToDrag, setDroppedToDrag] = useState(false);
  const cameraFallback = module.background === 'camera' && (preview || mode === 'drag' || droppedToDrag);
  const background = module.background === 'panorama' ? 'panorama' : cameraFallback ? (module.panorama_image ? 'panorama' : 'neutral') : 'camera';
  const panoramaUrl = background === 'panorama' ? module.panorama_image : null;

  const { session, status, error, start, fellBackToDrag } = useArStage(containerRef, {
    enabled: true,
    mode,
    autoStart: true,
    background,
    panoramaUrl,
    reducedMotion: reduceMotion,
  });
  useEffect(() => {
    if (fellBackToDrag) setDroppedToDrag(true);
  }, [fellBackToDrag]);
  const dragActive = mode === 'drag' || fellBackToDrag;

  const [stage, setStage] = useState<ModelStage | null>(null);
  const stageRef = useRef<ModelStage | null>(null);
  const [load, setLoad] = useState<LoadState>({ status: 'loading', progress: 0 });
  const [seen, setSeen] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const [motionHint, setMotionHint] = useState(false);

  const points = module.info_points;
  const seenSet = useMemo(() => new Set(seen), [seen]);
  const running = status === 'running';
  const ready = running && load.status === 'ready';

  const params: ModelStageParams = useMemo(
    () => ({
      yaw: module.yaw,
      distance_m: module.distance_m,
      elevation_m: module.elevation_m,
      height_m: module.height_m,
      rotation_deg: module.rotation_deg,
      auto_rotate: module.auto_rotate,
    }),
    [module.yaw, module.distance_m, module.elevation_m, module.height_m, module.rotation_deg, module.auto_rotate]
  );
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const liveRef = useRef<LiveData>({ points, seen: seenSet, paused: false, userRotate: module.user_rotate });
  liveRef.current = { points, seen: seenSet, paused: openId !== null || moreOpen, userRotate: module.user_rotate };

  const openPoint = useCallback((id: string) => {
    setMoreOpen(false);
    setOpenId(id);
    setSeen((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);
  const openPointRef = useRef(openPoint);
  openPointRef.current = openPoint;

  // Modell-Bühne in der Session (Licht, Platzierung, Drehung); Parameteränderungen wirken ohne Neuladen
  useEffect(() => {
    if (!session) return;
    const created = new ModelStage(session, paramsRef.current, { reducedMotion: reduceMotion });
    stageRef.current = created;
    setStage(created);
    return () => {
      created.dispose();
      stageRef.current = null;
      setStage(null);
    };
  }, [session, reduceMotion]);

  useEffect(() => {
    stage?.setParams(params);
  }, [stage, params]);

  // Nur ein anderes Modell lädt neu
  const modelUrl = module.model;
  useEffect(() => {
    if (!stage) return;
    if (!modelUrl) {
      setLoad({ status: 'error' });
      return;
    }
    let cancelled = false;
    setLoad({ status: 'loading', progress: 0 });
    let lastReported = 0;
    stage
      .load(modelUrl, (fraction) => {
        if (cancelled || fraction - lastReported < 0.01) return;
        lastReported = fraction;
        setLoad({ status: 'loading', progress: fraction });
      })
      .then(() => {
        if (!cancelled) setLoad({ status: 'ready' });
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setLoad({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [stage, modelUrl]);

  // Orientierungsmodus: Wischen über die Bühne dreht das Modell (der Lagesensor braucht keine Zeigereingabe)
  const beginGestureRef = useRef<((event: PointerEvent) => void) | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !stage) return;
    let gesture: { id: number; startX: number; startY: number; lastX: number; moving: boolean } | null = null;

    const begin = (event: PointerEvent) => {
      gesture = { id: event.pointerId ?? 0, startX: event.clientX, startY: event.clientY, lastX: event.clientX, moving: false };
      stage.beginInteraction();
    };
    const end = (event: PointerEvent) => {
      if (!gesture || (event.pointerId ?? 0) !== gesture.id) return;
      try {
        el.releasePointerCapture?.(gesture.id);
      } catch {
        // Zeiger war nicht eingefangen
      }
      gesture = null;
      stage.endInteraction();
    };
    const onDown = (event: PointerEvent) => {
      if (dragActive || gesture || !liveRef.current.userRotate || liveRef.current.paused) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) return;
      begin(event);
    };
    const onMove = (event: PointerEvent) => {
      if (!gesture || (event.pointerId ?? 0) !== gesture.id) return;
      if (!gesture.moving) {
        if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < SWIPE_START_PX) return;
        gesture.moving = true;
        try {
          el.setPointerCapture?.(gesture.id);
        } catch {
          // Zeiger schon beendet
        }
      }
      stage.dragBy((event.clientX - gesture.lastX) * DEG_PER_PX * RAD);
      gesture.lastX = event.clientX;
    };

    beginGestureRef.current = begin;
    if (!dragActive) el.style.touchAction = 'none';
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    return () => {
      beginGestureRef.current = null;
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      if (gesture) stage.endInteraction();
    };
  }, [stage, dragActive]);

  // Ziehen-Modus: Ziehen auf dem Modell dreht das Modell, sonst den Blick (Raycast beim Drücken)
  useEffect(() => {
    if (!session || !dragActive) return;
    session.setInput(
      new DragInput({
        reducedMotion: reduceMotion,
        onDragStart: (event) => {
          const current = stageRef.current;
          const el = containerRef.current;
          if (!current || !el || !liveRef.current.userRotate || liveRef.current.paused) return;
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
          if (!current.pickWorld(ndcX, ndcY)) return;
          beginGestureRef.current?.(event);
          return false;
        },
      })
    );
  }, [session, dragActive, reduceMotion]);

  // Frame-Callback: Beschriftung, Infopunkte (Marker, Verdeckung, Anvisieren, Verweilen), Randhinweis
  useEffect(() => {
    if (!session || !stage) return;
    const dwell = new DwellTracker();
    const world = new THREE.Vector3();
    const local = new THREE.Vector3();
    const inverse = new THREE.Quaternion();
    let builtFor: ModelInfoPoint<string>[] | null = null;
    let worlds: THREE.Vector3[] = [];
    let dirs: THREE.Vector3[] = [];
    let targets: GazeTarget[] = [];
    let occluded: boolean[] = [];
    let sinceOcclusionCheck = Infinity;
    let aimedId: string | null = null;
    let wasPaused = false;

    const off = session.onFrame((ctx) => {
      const live = liveRef.current;
      const label = labelRef.current;
      if (!stage.loaded) {
        if (label) label.style.visibility = 'hidden';
        for (const p of live.points) markerRef.current?.place(p.id, 0, 0, false);
        edgeRef.current?.place(null);
        return;
      }

      if (builtFor !== live.points) {
        builtFor = live.points;
        worlds = live.points.map(() => new THREE.Vector3());
        dirs = live.points.map(() => new THREE.Vector3());
        occluded = live.points.map(() => false);
        targets = live.points.map((p, i) => ({ id: p.id, dir: dirs[i], radiusDeg: GAZE_RADIUS.small }));
        sinceOcclusionCheck = Infinity;
      }

      // Beschriftung über der Modell-Oberkante, am Bildrand festgehalten
      if (label) {
        const top = session.projectToContainer(stage.topWorld(world));
        if (top.visible) {
          const x = Math.min(ctx.width - LABEL_SIDE_MARGIN, Math.max(LABEL_SIDE_MARGIN, top.x));
          const y = Math.min(ctx.height - LABEL_BOTTOM_MARGIN, Math.max(LABEL_TOP_MIN, top.y));
          label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
          label.style.visibility = 'visible';
        } else {
          label.style.visibility = 'hidden';
        }
      }

      // Punkte in der Welt, Verdeckung (nicht in jedem Bild) und Marker
      sinceOcclusionCheck += ctx.dtMs;
      const check = sinceOcclusionCheck >= OCCLUSION_INTERVAL_MS;
      if (check) sinceOcclusionCheck = 0;
      for (let i = 0; i < live.points.length; i++) {
        stage.pointToWorld(live.points[i], worlds[i]);
        dirs[i].copy(worlds[i]).normalize();
        if (check) {
          occluded[i] = stage.isOccluded(worlds[i]);
          targets[i].enabled = !occluded[i];
        }
        const pos = session.projectToContainer(worlds[i]);
        const onScreen =
          pos.visible &&
          pos.x >= -OFFSCREEN_MARGIN &&
          pos.x <= ctx.width + OFFSCREEN_MARGIN &&
          pos.y >= -OFFSCREEN_MARGIN &&
          pos.y <= ctx.height + OFFSCREEN_MARGIN;
        markerRef.current?.place(live.points[i].id, pos.x, pos.y, onScreen && !occluded[i]);
      }

      // Info oder Beschreibung offen: Verweilen pausiert
      if (live.paused) {
        if (!wasPaused) {
          wasPaused = true;
          dwell.reset();
          aimedId = null;
          markerRef.current?.setAimed(null);
          reticleRef.current?.update(false, 0);
        }
        edgeRef.current?.place(null);
        return;
      }
      wasPaused = false;

      // Anvisiert werden alle sichtbaren Punkte; nur noch nicht geöffnete füllen den Verweil-Ring
      aimedId = pickGazeTarget(ctx.forward, targets, aimedId);
      const dwellTarget = aimedId !== null && !live.seen.has(aimedId) ? aimedId : null;
      const state = dwell.update(dwellTarget, ctx.dtMs);
      reticleRef.current?.update(aimedId !== null, state.progress);
      markerRef.current?.setAimed(aimedId);
      if (state.completedId) openPointRef.current(state.completedId);

      // Randhinweis zum Modell, wenn seine Mitte nicht im Bild liegt
      const center = stage.centerWorld(world);
      const pos = session.projectToContainer(center);
      const centerOnScreen = pos.visible && pos.x >= 0 && pos.x <= ctx.width && pos.y >= 0 && pos.y <= ctx.height;
      if (centerOnScreen) {
        edgeRef.current?.place(null);
      } else {
        local.copy(center).normalize().applyQuaternion(inverse.copy(ctx.camera.quaternion).invert());
        edgeRef.current?.place(Math.atan2(-local.y, local.x));
      }
    });

    return () => {
      off();
      dwell.reset();
      markerRef.current?.setAimed(null);
      reticleRef.current?.update(false, 0);
      edgeRef.current?.place(null);
    };
  }, [session, stage]);

  // Hinweise laufen nach einigen Sekunden von selbst aus
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setHintVisible(false), HINT_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  // Lagesensor nicht nutzbar: einmal darauf hinweisen
  useEffect(() => {
    if (!fellBackToDrag) return;
    setMotionHint(true);
    const timer = window.setTimeout(() => setMotionHint(false), MOTION_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [fellBackToDrag]);

  const markers: ArMarker[] = useMemo(
    () =>
      points.map((p, i) => ({
        id: p.id,
        label: t('model3dPointTitled', { n: i + 1, title: pickLang(lang, p.title_de, p.title_en) }),
        number: i + 1,
        found: seenSet.has(p.id),
        size: 'small' as const,
      })),
    [points, seenSet, lang, t]
  );

  const caption = pickLang(lang, module.caption_de, module.caption_en);
  const moreText = pickLang(lang, module.text_de, module.text_en);
  const openPointData = openId === null ? null : (points.find((p) => p.id === openId) ?? null);
  const showStartCard = mode === 'orientation' && (status === 'idle' || status === 'starting');
  const sessionFailed = status === 'error';
  const modelFailed = running && load.status === 'error';
  const statusHint = !ready
    ? null
    : motionHint
      ? t('arDiscoverMotionDenied')
      : hintVisible
        ? dragActive
          ? t(module.user_rotate ? 'model3dDragHint' : 'model3dDragHintLook')
          : module.user_rotate
            ? t('model3dSwipeHint')
            : null
        : points.length > 0 && seen.length === 0
          ? t('model3dAimHint')
          : null;

  const closeInfo = () => setOpenId(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black">
        {points.length > 0 && <ArMarkerLayer ref={markerRef} markers={markers} onOpen={openPoint} />}
        {points.length > 0 && <ArReticle ref={reticleRef} />}
        <ArEdgeHint ref={edgeRef} />

        {/* Beschriftung über dem Modell; die Bühne positioniert sie pro Bild */}
        {running && (caption || moreText) && (
          <div ref={labelRef} className="pointer-events-none invisible absolute left-0 top-0 z-10 flex max-w-[80%] flex-col items-center gap-2">
            {caption && <p className="rounded-full bg-black/50 px-4 py-2 text-center text-sm font-semibold text-white backdrop-blur">{caption}</p>}
            {moreText && (
              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  setMoreOpen(true);
                }}
                className="pressable pointer-events-auto min-h-[44px] rounded-full bg-white px-5 text-sm font-extrabold text-primary shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                {t('model3dMore')}
              </button>
            )}
          </div>
        )}

        {running && load.status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
            <GlassCard className="w-full max-w-xs p-5 text-center">
              <LoadingRing progress={load.progress} />
              <p role="status" className="mt-3 text-sm font-semibold text-white">
                {t('model3dLoading')}
                {load.progress > 0 && <span className="ml-1.5 tabular-nums">{t('model3dLoadingPercent', { percent: Math.round(load.progress * 100) })}</span>}
              </p>
            </GlassCard>
          </div>
        )}

        {running && (
          <div className="pointer-events-none absolute inset-x-0 z-10 px-5" style={{ bottom: 'var(--module-footer-pad, max(24px, env(safe-area-inset-bottom, 0px)))' }}>
            <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
              {modelFailed && (
                <div className="pointer-events-auto w-full">
                  <Feedback tone="error" title={t('model3dLoadError')} />
                </div>
              )}
              {statusHint && <p className={pillClass}>{statusHint}</p>}
              {ready && module.user_rotate && (
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => stage?.rotateBy(-ROTATE_STEP_DEG)} aria-label={t('model3dRotateLeft')} title={t('model3dRotateLeft')} className={roundButtonClass}>
                    <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => stage?.rotateBy(ROTATE_STEP_DEG)} aria-label={t('model3dRotateRight')} title={t('model3dRotateRight')} className={roundButtonClass}>
                    <RotateCw className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="pointer-events-auto flex w-full">
                <PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>
              </div>
            </div>
          </div>
        )}

        {showStartCard && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
            <GlassCard className="w-full max-w-sm p-6 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/12" aria-hidden="true">
                <Box className="h-7 w-7" />
              </span>
              <h2 className="text-xl font-extrabold tracking-tight text-white">{t('model3dStartTitle')}</h2>
              <ModuleText className="mt-2">{caption || t('model3dStartBody')}</ModuleText>
              <div className="mt-5 flex">
                <PrimaryButton onClick={() => void start()} disabled={status === 'starting'} aria-busy={status === 'starting'}>
                  {t('model3dStart')}
                </PrimaryButton>
              </div>
            </GlassCard>
          </div>
        )}

        {sessionFailed && (
          <div className="absolute inset-0 z-10 flex flex-col justify-center gap-4 px-5">
            <Feedback tone="error" title={error === 'camera-denied' || error === 'camera-unavailable' ? t('arDiscoverCameraError') : t('arDiscoverLoadError')} />
            <PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>
          </div>
        )}

        <AnimatePresence>
          {openPointData && (
            <ArInfoSheet
              key={`info-${openPointData.id}`}
              title={pickLang(lang, openPointData.title_de, openPointData.title_en)}
              text={pickLang(lang, openPointData.text_de, openPointData.text_en)}
              image={openPointData.image}
              actionLabel={t('model3dCloseInfo')}
              onAction={closeInfo}
              onClose={closeInfo}
            />
          )}
          {moreOpen && moreText && (
            <ArInfoSheet
              key="more"
              title={caption || t('model3dMore')}
              text={moreText}
              actionLabel={t('model3dCloseInfo')}
              onAction={() => setMoreOpen(false)}
              onClose={() => setMoreOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
