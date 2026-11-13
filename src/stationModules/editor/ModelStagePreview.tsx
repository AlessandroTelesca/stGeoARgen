import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from 'motion/react';
import { MapPinPlus, Move3d } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ModelStage, type ModelStageParams } from '../../ar/modelStage';
import { clampNormalized, type Vec3 } from '../../ar/modelSpace';
import { useArStage } from '../../ar/useArStage';
import { ArMarkerLayer, type ArMarker, type ArMarkerLayerHandle } from '../../ar/ui/ArMarkerLayer';
import { ArReticle } from '../../ar/ui/ArReticle';

/**
 * Live-Vorschau im Editor von 3D-Modell (three.js, daher als eigener Chunk nachgeladen): dieselbe
 * Bühne wie im Player (ArStageSession + ModelStage). Man schaut per Ziehen umher; Infopunkte setzt man
 * per Klick direkt auf das Modell. Parameter wirken sofort, nur eine andere Modelldatei lädt neu.
 */

export interface ModelPreviewStats {
  triangles: number;
  maxTextureSize: number;
}

export interface ModelPreviewPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  title: string;
}

interface ModelStagePreviewProps {
  modelUrl: string;
  /** 360°-Bild bzw. Referenzbild; ohne Bild steht das Modell vor neutralem Grund */
  backgroundUrl: string | null;
  params: ModelStageParams;
  points: ModelPreviewPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Neuer Punkt an dieser Stelle des Modells (die Höchstzahl prüft der Aufrufer über canAdd) */
  onPlace: (position: Vec3) => void;
  /** Ausgewählten Punkt an diese Stelle verschieben */
  onMoveSelected: (position: Vec3) => void;
  canAdd: boolean;
  /** Kennzahlen des geladenen Modells; null, solange geladen wird oder bei Fehlern */
  onStats: (stats: ModelPreviewStats | null) => void;
}

type PickMode = 'add' | 'move';

/** Marker verdeckter Punkte werden so oft neu geprüft (Strahltest gegen das ganze Modell ist teuer) */
const OCCLUSION_INTERVAL_MS = 250;
/** Bewegt sich der Zeiger weniger, gilt es als Klick (sonst als Ziehen zum Umsehen) */
const CLICK_SLOP_PX = 6;
const MISS_HINT_MS = 3000;

const toolClass =
  'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

export function ModelStagePreview({ modelUrl, backgroundUrl, params, points, selectedId, onSelect, onPlace, onMoveSelected, canAdd, onStats }: ModelStagePreviewProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<ArMarkerLayerHandle>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const [stage, setStage] = useState<ModelStage | null>(null);
  const [progress, setProgress] = useState<number | null>(0);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<PickMode | null>(null);
  const [missed, setMissed] = useState(false);

  const { session, status } = useArStage(containerRef, {
    enabled: true,
    mode: 'drag',
    autoStart: true,
    renderMode: 'onDemand',
    background: backgroundUrl ? 'panorama' : 'neutral',
    panoramaUrl: backgroundUrl,
    reducedMotion: !!reduceMotion,
  });

  const live = useRef({ points, selectedId, params });
  live.current = { points, selectedId, params };
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  // Bühne mit dem Modell: einmal je Session, Parameter und Modell folgen in eigenen Effekten
  useEffect(() => {
    if (!session) return;
    const created = new ModelStage(session, live.current.params, { reducedMotion: !!reduceMotion });
    setStage(created);
    return () => {
      created.dispose();
      setStage(null);
    };
  }, [session, reduceMotion]);

  useEffect(() => {
    if (!stage) return;
    stage.setParams(params);
  }, [stage, params]);

  useEffect(() => {
    if (!stage) return;
    let cancelled = false;
    setProgress(0);
    setFailed(false);
    onStatsRef.current(null);
    stage
      .load(modelUrl, (fraction) => {
        if (!cancelled) setProgress(fraction);
      })
      .then((stats) => {
        if (cancelled) return;
        setProgress(null);
        onStatsRef.current(stats);
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setProgress(null);
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [stage, modelUrl]);

  // Marker folgen dem Modell; die automatische Drehung braucht im Modus „onDemand“ ein neues Bild je Frame
  useEffect(() => {
    if (!session || !stage) return;
    const world = new THREE.Vector3();
    const occluded = new Map<string, boolean>();
    let lastCheck = -Infinity;
    return session.onFrame((ctx) => {
      const { points: current, selectedId: selected, params: p } = live.current;
      if (p.auto_rotate !== 'off' && stage.loaded) session.invalidate();
      const now = performance.now();
      const recheck = now - lastCheck >= OCCLUSION_INTERVAL_MS;
      if (recheck) lastCheck = now;
      for (const point of current) {
        stage.pointToWorld(point, world);
        if (recheck) occluded.set(point.id, stage.isOccluded(world));
        const pos = session.projectToContainer(world);
        const onScreen = pos.visible && pos.x >= -32 && pos.x <= ctx.width + 32 && pos.y >= -32 && pos.y <= ctx.height + 32;
        markerRef.current?.place(point.id, pos.x, pos.y, stage.loaded && onScreen && !occluded.get(point.id));
      }
      markerRef.current?.setAimed(selected);
    });
  }, [session, stage]);

  useEffect(() => {
    if (!missed) return;
    const timer = window.setTimeout(() => setMissed(false), MISS_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [missed]);

  // Auswahl aufgehoben (oder Punkt gelöscht): „Verschieben“ ergibt keinen Sinn mehr
  useEffect(() => {
    if (mode === 'move' && selectedId === null) setMode(null);
    if (mode === 'add' && !canAdd) setMode(null);
  }, [mode, selectedId, canAdd]);

  const markers: ArMarker[] = useMemo(
    () =>
      points.map((p, i) => ({
        id: p.id,
        label: p.title.trim() ? t('model3dPointTitled', { n: i + 1, title: p.title.trim() }) : t('model3dPoint', { n: i + 1 }),
        number: i + 1,
        found: false,
      })),
    [points, t]
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    downAt.current = (e.target as HTMLElement).closest('button') ? null : { x: e.clientX, y: e.clientY };
  };

  /** Klick (ohne Ziehen) im Setz-Modus: Stelle auf dem Modell unter dem Zeiger bestimmen */
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = downAt.current;
    downAt.current = null;
    if (!start || !mode || !stage || !containerRef.current) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_SLOP_PX) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    const hit = stage.pickWorld(ndcX, ndcY);
    if (!hit) {
      setMissed(true);
      return;
    }
    const position = clampNormalized(stage.worldToPoint(hit));
    if (mode === 'add') onPlace(position);
    else onMoveSelected(position);
    setMissed(false);
    setMode(null);
  };

  const toggle = (next: PickMode) => {
    setMissed(false);
    setMode((current) => (current === next ? null : next));
  };

  const loaded = stage !== null && progress === null && !failed;
  const hint = mode === 'add' ? t('model3dPlaceHintAdd') : mode === 'move' ? t('model3dPlaceHintMove') : t('model3dPreviewHint');
  const toolActive = 'border-primary bg-primary text-primary-foreground';
  const toolIdle = 'border-primary/25 bg-card text-primary hover:border-primary';

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={mode === 'add'}
          disabled={!loaded || !canAdd}
          onClick={() => toggle('add')}
          className={`${toolClass} ${mode === 'add' ? toolActive : toolIdle}`}
        >
          <MapPinPlus className="h-4 w-4" aria-hidden="true" />
          {t('model3dPlaceAdd')}
        </button>
        <button
          type="button"
          aria-pressed={mode === 'move'}
          disabled={!loaded || selectedId === null}
          onClick={() => toggle('move')}
          className={`${toolClass} ${mode === 'move' ? toolActive : toolIdle}`}
        >
          <Move3d className="h-4 w-4" aria-hidden="true" />
          {t('model3dPlaceMove')}
        </button>
      </div>

      <div
        ref={containerRef}
        role="group"
        aria-label={t('model3dPreviewLabel')}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900 ${mode ? 'cursor-crosshair' : ''}`}
      >
        <ArMarkerLayer ref={markerRef} markers={markers} onOpen={onSelect} />
        <ArReticle />
        {progress !== null && !failed && status !== 'error' && (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-black/45 px-4 py-2.5 text-xs font-semibold text-white" role="status">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full rounded-full bg-white transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
            <span className="tabular-nums">{t('model3dLoadingPercent', { percent: Math.round(progress * 100) })}</span>
          </div>
        )}
        {(failed || status === 'error') && (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/85">{t('model3dPreviewLoadError')}</p>
        )}
        {missed && (
          <p className="absolute inset-x-3 top-3 rounded-xl bg-black/60 px-3 py-2 text-center text-sm font-semibold text-white" role="status">
            {t('model3dPlaceMiss')}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
