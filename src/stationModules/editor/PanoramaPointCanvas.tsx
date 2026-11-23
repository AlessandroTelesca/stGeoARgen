import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { POINT_RADIUS_DEG, equirectToYawPitch, normalizePosition, yawPitchToEquirect } from './arDiscoverGeometry';

/**
 * Fläche im Seitenverhältnis 2:1 zum Platzieren der Punkte von AR-Entdecken. Die Fläche ist das
 * entrollte 360°-Bild (equirektangulär): Mitte = Startblick, links/rechts = hinten, oben/unten = Himmel/Boden.
 * Ohne Bild zeigt sie ein Richtungsraster. Klick = neuer Punkt, Ziehen verschiebt, Pfeiltasten feinjustieren.
 */

export interface CanvasPoint {
  id: string;
  yaw: number;
  pitch: number;
  size: 'small' | 'medium' | 'large';
}

interface PanoramaPointCanvasProps {
  /** 360°-Bild; null → Richtungsraster */
  imageUrl: string | null;
  points: CanvasPoint[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Klick auf freie Fläche (die Höchstzahl prüft der Aufrufer) */
  onAdd: (yaw: number, pitch: number) => void;
  onMove: (id: string, yaw: number, pitch: number) => void;
}

const KEY_STEP = 1;
const KEY_STEP_LARGE = 5;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Beschriftung des Rasters bei u = 0, 0.25, 0.5, 0.75, 1 */
const GRID_LABELS = [
  { u: 0, key: 'arDiscoverGrid_back' },
  { u: 0.25, key: 'arDiscoverGrid_left' },
  { u: 0.5, key: 'arDiscoverGrid_front' },
  { u: 0.75, key: 'arDiscoverGrid_right' },
  { u: 1, key: 'arDiscoverGrid_back' },
] as const;

/** Trefferbereich eines Punkts als Ellipse in Anteilen der Fläche (Breite wächst mit 1/cos(pitch)) */
function hitEllipse(point: CanvasPoint) {
  const radius = POINT_RADIUS_DEG[point.size];
  const cos = Math.max(0.1, Math.cos((point.pitch * Math.PI) / 180));
  const { u, v } = yawPitchToEquirect(point.yaw, point.pitch);
  return { u, v, w: Math.min(1, (2 * radius) / cos / 360), h: (2 * radius) / 180 };
}

export function PanoramaPointCanvas({ imageUrl, points, selectedId, onSelect, onAdd, onMove }: PanoramaPointCanvasProps) {
  const { t } = useLanguage();
  const areaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<string | null>(null);

  const positionAt = (clientX: number, clientY: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const u = clamp01((clientX - rect.left) / rect.width);
    const v = clamp01((clientY - rect.top) / rect.height);
    const { yaw, pitch } = equirectToYawPitch(u, v);
    return normalizePosition(yaw, pitch);
  };

  const handleAreaClick = (e: { clientX: number; clientY: number }) => {
    const pos = positionAt(e.clientX, e.clientY);
    if (pos) onAdd(pos.yaw, pos.pitch);
  };

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = id;
    onSelect(id);
  };

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    if (dragRef.current !== id) return;
    const pos = positionAt(e.clientX, e.clientY);
    if (pos) onMove(id, pos.yaw, pos.pitch);
  };

  const handlePointerEnd = (e: PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const point = points.find((p) => p.id === selectedId);
    if (!point) return;
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = delta[e.key];
    if (!move) return;
    e.preventDefault();
    const pos = normalizePosition(point.yaw + move[0], point.pitch + move[1]);
    onMove(point.id, pos.yaw, pos.pitch);
  };

  return (
    <div
      ref={areaRef}
      role="group"
      tabIndex={0}
      aria-label={t('arDiscoverMapLabel')}
      onClick={handleAreaClick}
      onKeyDown={handleKeyDown}
      className="relative aspect-[2/1] w-full cursor-crosshair select-none overflow-hidden rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900 outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-fill" />
      ) : (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Meridiane alle 30° */}
          {Array.from({ length: 11 }, (_, i) => (
            <span key={i} className="absolute inset-y-0 w-px bg-white/15" style={{ left: `${((i + 1) / 12) * 100}%` }} />
          ))}
          {/* Horizont und ±45° */}
          <span className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
          <span className="absolute inset-x-0 top-1/4 h-px bg-white/15" />
          <span className="absolute inset-x-0 top-3/4 h-px bg-white/15" />
          <span className="absolute right-1.5 top-1/4 mt-0.5 text-[11px] font-semibold text-white/70">+45°</span>
          <span className="absolute right-1.5 top-3/4 mt-0.5 text-[11px] font-semibold text-white/70">−45°</span>
          {GRID_LABELS.map(({ u, key }) => (
            <span
              key={u}
              className={`absolute bottom-1.5 text-[11px] font-semibold text-white/75 ${u === 0 ? 'left-1.5' : u === 1 ? 'right-1.5' : '-translate-x-1/2'}`}
              style={u > 0 && u < 1 ? { left: `${u * 100}%` } : undefined}
            >
              {t(key)}
            </span>
          ))}
        </div>
      )}

      {/* Startblick */}
      <span className="pointer-events-none absolute inset-y-0 left-1/2 border-l-2 border-dashed border-white/70" aria-hidden="true" />
      <span className="pointer-events-none absolute left-1/2 top-1.5 ml-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white" aria-hidden="true">
        {t('arDiscoverStartView')}
      </span>

      {/* Trefferbereiche (mit Kopie am Rand, wenn die Ellipse über die Naht ragt) */}
      {points.map((point) => {
        const { u, v, w, h } = hitEllipse(point);
        const offsets = [0, ...(u - w / 2 < 0 ? [1] : []), ...(u + w / 2 > 1 ? [-1] : [])];
        return offsets.map((offset) => (
          <span
            key={`${point.id}:${offset}`}
            aria-hidden="true"
            className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border ${selectedId === point.id ? 'border-white bg-primary/35' : 'border-white/50 bg-white/15'}`}
            style={{ left: `${(u + offset) * 100}%`, top: `${v * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
          />
        ));
      })}

      {points.map((point, index) => {
        const { u, v } = yawPitchToEquirect(point.yaw, point.pitch);
        const selected = selectedId === point.id;
        return (
          <button
            key={point.id}
            type="button"
            aria-label={t('arDiscoverPoint', { n: index + 1 })}
            aria-pressed={selected}
            onPointerDown={(e) => handlePointerDown(e, point.id)}
            onPointerMove={(e) => handlePointerMove(e, point.id)}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onClick={(e) => e.stopPropagation()}
            className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full text-sm font-bold tabular-nums text-white shadow-md outline-none before:absolute before:-inset-2 before:content-[''] focus-visible:ring-4 focus-visible:ring-primary/40 ${selected ? 'z-10 scale-125 bg-primary-dark ring-4 ring-white' : 'bg-primary ring-2 ring-white'}`}
            style={{ left: `${u * 100}%`, top: `${v * 100}%` }}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}
