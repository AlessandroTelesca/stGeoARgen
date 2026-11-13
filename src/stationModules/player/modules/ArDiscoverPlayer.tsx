import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import { List, ScanEye, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { dirFromYawPitch } from '../../../ar/angles';
import { GAZE_RADIUS, pickGazeTarget, type GazeTarget } from '../../../ar/gaze';
import { DwellTracker } from '../../../ar/dwell';
import { pickInputMode } from '../../../ar/inputs';
import { useArStage } from '../../../ar/useArStage';
import { ArEdgeHint, type ArEdgeHintHandle } from '../../../ar/ui/ArEdgeHint';
import { ArInfoSheet } from '../../../ar/ui/ArInfoSheet';
import { ArMarkerLayer, type ArMarker, type ArMarkerLayerHandle } from '../../../ar/ui/ArMarkerLayer';
import { ArPointList } from '../../../ar/ui/ArPointList';
import { ArReticle, type ArReticleHandle } from '../../../ar/ui/ArReticle';
import { pickLang, type ArDiscoverPoint } from '../../types';
import { Feedback, GlassCard, ModuleText, PrimaryButton, type ModulePlayerProps } from '../ui';

/** Dauer der Hinweis-Pillen („Ziehen zum Umsehen“, „Bewegungssensor nicht verfügbar“) */
const DRAG_HINT_MS = 4000;
const MOTION_HINT_MS = 6000;
const ALL_FOUND_MS = 4500;
/** Abstand der Punkte zur Kamera (Pixelposition hängt nur von der Richtung ab) */
const MARKER_DISTANCE = 10;
/** Marker außerhalb des Bildes (mit Rand) sind für Tastatur und Screenreader aus dem Weg */
const OFFSCREEN_MARGIN = 32;
/** Blickbewegung in Grad, ab der der Ziehen-Hinweis verschwindet */
const MOVED_DEG = 3;

const pillClass = 'rounded-full bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur';

/** Daten, die der Frame-Callback pro Bild liest (aktuelle Props, ohne die Session neu aufzubauen) */
interface LiveData {
  points: ArDiscoverPoint<string>[];
  found: ReadonlySet<string>;
  paused: boolean;
}

/**
 * AR-Entdecken: 360°-Bild oder Live-Kamera mit frei platzierten Punkten. Ein Laser aus der Bildmitte;
 * wer einen Punkt ~1,5 s anvisiert (oder antippt), öffnet seine Info. Am Handy steuert der Lagesensor
 * den Blick, sonst Ziehen und Pfeiltasten (auch in der Vorschau der Stationsverwaltung).
 * Pro Bild läuft nur der Frame-Callback der Bühne; React-State ändert sich nur bei Ereignissen.
 */
export function ArDiscoverPlayer({ module, lang, preview, continueLabel, onContinue }: ModulePlayerProps<'ar_discover'>) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<ArMarkerLayerHandle>(null);
  const reticleRef = useRef<ArReticleHandle>(null);
  const edgeRef = useRef<ArEdgeHintHandle>(null);

  const [mode] = useState<'orientation' | 'drag'>(() =>
    preview
      ? 'drag'
      : pickInputMode({ preview: false, isTouch: typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches })
  );

  // Kamera-Hintergrund gibt es nur mit Lagesensor am Handy; sonst Referenzbild bzw. neutraler Hintergrund
  const cameraFallback = module.background === 'camera' && (preview || mode === 'drag');
  const background = module.background === 'panorama' ? 'panorama' : cameraFallback ? (module.panorama_image ? 'panorama' : 'neutral') : 'camera';
  const panoramaUrl = background === 'panorama' ? module.panorama_image : null;

  const { session, status, error, start, fellBackToDrag } = useArStage(containerRef, {
    enabled: true,
    mode,
    autoStart: true,
    background,
    panoramaUrl,
    reducedMotion: !!reduceMotion,
  });

  const [found, setFound] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [dragHint, setDragHint] = useState(true);
  // Einleitung im Ziehen-Modus (Desktop/Vorschau): bleibt bis zum ersten Umsehen oder Schließen stehen
  const [introOpen, setIntroOpen] = useState(true);
  const [motionHint, setMotionHint] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const celebratedRef = useRef(false);
  const celebrateTimer = useRef<number | null>(null);

  const points = module.points;
  const foundSet = useMemo(() => new Set(found), [found]);
  const foundCount = points.filter((p) => foundSet.has(p.id)).length;
  const allFound = points.length > 0 && foundCount === points.length;
  const running = status === 'running';

  const liveRef = useRef<LiveData>({ points, found: foundSet, paused: false });
  liveRef.current = { points, found: foundSet, paused: openId !== null || listOpen };

  const openPoint = useCallback((id: string) => {
    setListOpen(false);
    setOpenId(id);
    setFound((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);
  const openPointRef = useRef(openPoint);
  openPointRef.current = openPoint;

  // Frame-Callback: anvisieren, Verweilen, Marker und Randhinweis positionieren
  useEffect(() => {
    if (!session) return;
    const dwell = new DwellTracker();
    const world = new THREE.Vector3();
    const local = new THREE.Vector3();
    const inverse = new THREE.Quaternion();
    let builtFor: ArDiscoverPoint<string>[] | null = null;
    let dirs: THREE.Vector3[] = [];
    let targets: GazeTarget[] = [];
    let aimedId: string | null = null;
    let wasPaused = false;
    let startForward: THREE.Vector3 | null = null;
    let movedReported = false;

    const off = session.onFrame((ctx) => {
      const live = liveRef.current;
      if (builtFor !== live.points) {
        builtFor = live.points;
        dirs = live.points.map((p) => dirFromYawPitch(p.yaw, p.pitch));
        targets = live.points.map((p, i) => ({ id: p.id, dir: dirs[i], radiusDeg: GAZE_RADIUS[p.size] }));
      }

      if (!movedReported) {
        if (!startForward) startForward = ctx.forward.clone();
        else if (startForward.angleTo(ctx.forward) * (180 / Math.PI) > MOVED_DEG) {
          movedReported = true;
          setDragHint(false);
          setIntroOpen(false);
        }
      }

      // Marker positionieren; merken, ob irgendein Punkt im Bild liegt
      let anyOnScreen = false;
      for (let i = 0; i < live.points.length; i++) {
        const pos = session.projectToContainer(world.copy(dirs[i]).multiplyScalar(MARKER_DISTANCE));
        const onScreen =
          pos.visible &&
          pos.x >= -OFFSCREEN_MARGIN &&
          pos.x <= ctx.width + OFFSCREEN_MARGIN &&
          pos.y >= -OFFSCREEN_MARGIN &&
          pos.y <= ctx.height + OFFSCREEN_MARGIN;
        if (onScreen) anyOnScreen = true;
        markerRef.current?.place(live.points[i].id, pos.x, pos.y, onScreen);
      }

      // Info oder Liste offen: Verweilen pausiert
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

      // Anvisiert werden alle Punkte; nur noch nicht entdeckte füllen den Verweil-Ring
      aimedId = pickGazeTarget(ctx.forward, targets, aimedId);
      const dwellTarget = aimedId !== null && !live.found.has(aimedId) ? aimedId : null;
      const state = dwell.update(dwellTarget, ctx.dtMs);
      reticleRef.current?.update(aimedId !== null, state.progress);
      markerRef.current?.setAimed(aimedId);
      if (state.completedId) openPointRef.current(state.completedId);

      // Randhinweis: nur, wenn kein Punkt im Bild ist; zeigt zum nächsten unentdeckten
      let nearest = -1;
      if (!anyOnScreen) {
        let best = -Infinity;
        for (let i = 0; i < live.points.length; i++) {
          if (live.found.has(live.points[i].id)) continue;
          const dot = ctx.forward.dot(dirs[i]);
          if (dot > best) {
            best = dot;
            nearest = i;
          }
        }
      }
      if (nearest < 0) {
        edgeRef.current?.place(null);
      } else {
        local.copy(dirs[nearest]).applyQuaternion(inverse.copy(ctx.camera.quaternion).invert());
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
  }, [session]);

  // Ziehen-Hinweis läuft nach einigen Sekunden von selbst aus
  useEffect(() => {
    if (!running || mode !== 'drag') return;
    const timer = window.setTimeout(() => setDragHint(false), DRAG_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [running, mode]);

  // Lagesensor nicht nutzbar: einmal darauf hinweisen
  useEffect(() => {
    if (!fellBackToDrag) return;
    setMotionHint(true);
    const timer = window.setTimeout(() => setMotionHint(false), MOTION_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [fellBackToDrag]);

  // „Alles entdeckt!“ einmalig, sobald keine Karte mehr offen ist
  useEffect(() => {
    if (!allFound || openId !== null || celebratedRef.current) return;
    celebratedRef.current = true;
    setCelebrate(true);
    celebrateTimer.current = window.setTimeout(() => setCelebrate(false), ALL_FOUND_MS);
  }, [allFound, openId]);
  useEffect(
    () => () => {
      if (celebrateTimer.current !== null) window.clearTimeout(celebrateTimer.current);
    },
    []
  );

  const markers: ArMarker[] = useMemo(
    () =>
      points.map((p, i) => ({
        id: p.id,
        label: t('arDiscoverPointTitled', { n: i + 1, title: pickLang(lang, p.title_de, p.title_en) }),
        number: i + 1,
        found: foundSet.has(p.id),
        size: p.size,
      })),
    [points, foundSet, lang, t]
  );

  const openIndex = openId === null ? -1 : points.findIndex((p) => p.id === openId);
  const openPointData = openIndex >= 0 ? points[openIndex] : null;
  const intro = pickLang(lang, module.intro_de, module.intro_en);
  const showStartCard = mode === 'orientation' && (status === 'idle' || status === 'starting');
  const failed = status === 'error';
  const canContinue = !module.require_all || allFound;
  const statusHint = motionHint ? t('arDiscoverMotionDenied') : mode === 'drag' && dragHint ? t('arDiscoverDragHint') : foundCount === 0 ? t('arDiscoverAimHint') : null;

  const closeInfo = () => setOpenId(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black">
        <ArMarkerLayer ref={markerRef} markers={markers} onOpen={openPoint} />
        <ArReticle ref={reticleRef} />
        <ArEdgeHint ref={edgeRef} />

        {running && (
          <>
            {/* Kopfzeile: Zähler und Liste aller Punkte */}
            <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-3">
              <p aria-live="polite" className="rounded-full bg-black/45 px-3.5 py-2 text-sm font-bold tabular-nums text-white backdrop-blur">
                {t('arDiscoverCount', { found: foundCount, total: points.length })}
              </p>
              <button
                type="button"
                onClick={() => setListOpen(true)}
                aria-label={t('arDiscoverList')}
                title={t('arDiscoverList')}
                className="pointer-events-auto flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                <List className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Einleitung im Ziehen-Modus (am Handy steht sie auf der Startkarte) */}
            {mode === 'drag' && introOpen && intro && (
              <div className="absolute inset-x-3 top-16 z-10 mx-auto max-w-md">
                <GlassCard className="flex items-start gap-3 px-4 py-3">
                  <ModuleText className="flex-1">{intro}</ModuleText>
                  <button
                    type="button"
                    onClick={() => setIntroOpen(false)}
                    aria-label={t('close')}
                    className="-mr-1 -mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </GlassCard>
              </div>
            )}

            {/* Unten: Hinweis, „Alles entdeckt“, Weiter */}
            <div className="pointer-events-none absolute inset-x-0 z-10 px-5" style={{ bottom: 'var(--module-footer-pad, max(24px, env(safe-area-inset-bottom, 0px)))' }}>
              <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
                {celebrate && (
                  <div className="w-full">
                    <Feedback tone="success" title={t('arDiscoverAllFound')} />
                  </div>
                )}
                {statusHint && !celebrate && <p className={pillClass}>{statusHint}</p>}
                {canContinue && (
                  <div className="pointer-events-auto flex w-full">
                    <PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {showStartCard && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
            <GlassCard className="w-full max-w-sm p-6 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/12" aria-hidden="true">
                <ScanEye className="h-7 w-7" />
              </span>
              <h2 className="text-xl font-extrabold tracking-tight text-white">{t('arDiscoverStartTitle')}</h2>
              <ModuleText className="mt-2">{intro ?? t('arDiscoverStartBody')}</ModuleText>
              <div className="mt-5 flex">
                <PrimaryButton onClick={() => void start()} disabled={status === 'starting'} aria-busy={status === 'starting'}>
                  {t('arDiscoverStart')}
                </PrimaryButton>
              </div>
            </GlassCard>
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 z-10 flex flex-col justify-center gap-4 px-5">
            <Feedback tone="error" title={error === 'camera-denied' || error === 'camera-unavailable' ? t('arDiscoverCameraError') : t('arDiscoverLoadError')} />
            <PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>
          </div>
        )}

        <AnimatePresence>
          {listOpen && (
            <ArPointList
              key="list"
              title={t('arDiscoverListTitle')}
              closeLabel={t('close')}
              foundLabel={t('arDiscoverPointFound')}
              items={points.map((p, i) => ({
                id: p.id,
                number: i + 1,
                label: pickLang(lang, p.title_de, p.title_en),
                found: foundSet.has(p.id),
              }))}
              onSelect={openPoint}
              onClose={() => setListOpen(false)}
            />
          )}
          {openPointData && (
            <ArInfoSheet
              key={`info-${openPointData.id}`}
              title={pickLang(lang, openPointData.title_de, openPointData.title_en)}
              text={pickLang(lang, openPointData.text_de, openPointData.text_en)}
              image={openPointData.image}
              actionLabel={allFound ? continueLabel : t('arDiscoverContinueSearching')}
              onAction={allFound ? () => { closeInfo(); onContinue(); } : closeInfo}
              onClose={closeInfo}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
