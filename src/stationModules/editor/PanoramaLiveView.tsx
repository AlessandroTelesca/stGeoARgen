import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from 'motion/react';
import { Crosshair, MoveDiagonal } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { dirFromYawPitch, yawPitchFromQuaternion } from '../../ar/angles';
import { useArStage } from '../../ar/useArStage';
import { ArMarkerLayer, type ArMarker, type ArMarkerLayerHandle } from '../../ar/ui/ArMarkerLayer';
import { ArReticle } from '../../ar/ui/ArReticle';
import { normalizePosition } from './arDiscoverGeometry';
import type { CanvasPoint } from './PanoramaPointCanvas';

/**
 * Kleine Live-Bühne im Editor von AR-Entdecken (three.js, daher als eigener Chunk nachgeladen):
 * Man schaut per Ziehen im 360°-Bild umher und setzt Punkte genau dorthin, wohin die Bildmitte zeigt.
 */

interface PanoramaLiveViewProps {
  imageUrl: string | null;
  points: CanvasPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Neuer Punkt in Blickrichtung (die Höchstzahl prüft der Aufrufer) */
  onPlace: (yaw: number, pitch: number) => void;
  /** Ausgewählten Punkt in Blickrichtung verschieben */
  onMoveSelected: (yaw: number, pitch: number) => void;
}

const MARKER_DISTANCE = 10;
const actionClass =
  'flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-primary/25 bg-card px-3 text-sm font-bold text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-primary/25';

export function PanoramaLiveView({ imageUrl, points, selectedId, onSelect, onPlace, onMoveSelected }: PanoramaLiveViewProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<ArMarkerLayerHandle>(null);

  const { session, status } = useArStage(containerRef, {
    enabled: true,
    mode: 'drag',
    autoStart: true,
    renderMode: 'onDemand',
    background: imageUrl ? 'panorama' : 'neutral',
    panoramaUrl: imageUrl,
    reducedMotion: !!reduceMotion,
  });

  const liveRef = useRef({ points, selectedId });
  liveRef.current = { points, selectedId };

  // Marker folgen der Kamera (Anzeige; Antippen wählt den Punkt aus)
  useEffect(() => {
    if (!session) return;
    const world = new THREE.Vector3();
    return session.onFrame((ctx) => {
      const { points: current, selectedId: selected } = liveRef.current;
      for (const point of current) {
        const pos = session.projectToContainer(world.copy(dirFromYawPitch(point.yaw, point.pitch)).multiplyScalar(MARKER_DISTANCE));
        const onScreen = pos.visible && pos.x >= -32 && pos.x <= ctx.width + 32 && pos.y >= -32 && pos.y <= ctx.height + 32;
        markerRef.current?.place(point.id, pos.x, pos.y, onScreen);
      }
      markerRef.current?.setAimed(selected);
    });
  }, [session]);

  const markers: ArMarker[] = useMemo(
    () =>
      points.map((p, i) => ({ id: p.id, label: t('arDiscoverPoint', { n: i + 1 }), number: i + 1, found: false, size: p.size })),
    [points, t]
  );

  const lookingAt = () => {
    if (!session) return null;
    const { yaw, pitch } = yawPitchFromQuaternion(session.camera.quaternion);
    return normalizePosition(yaw, pitch);
  };

  return (
    <div className="space-y-2.5">
      <div ref={containerRef} className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900">
        <ArMarkerLayer ref={markerRef} markers={markers} onOpen={onSelect} />
        <ArReticle />
        {status === 'error' && (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/85">{t('arDiscoverLoadError')}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t('arDiscoverLiveHint')}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!session}
          onClick={() => {
            const pos = lookingAt();
            if (pos) onPlace(pos.yaw, pos.pitch);
          }}
          className={actionClass}
        >
          <Crosshair className="h-4 w-4" aria-hidden="true" />
          {t('arDiscoverPlaceHere')}
        </button>
        <button
          type="button"
          disabled={!session || selectedId === null}
          onClick={() => {
            const pos = lookingAt();
            if (pos) onMoveSelected(pos.yaw, pos.pitch);
          }}
          className={actionClass}
        >
          <MoveDiagonal className="h-4 w-4" aria-hidden="true" />
          {t('arDiscoverMoveHere')}
        </button>
      </div>
    </div>
  );
}
