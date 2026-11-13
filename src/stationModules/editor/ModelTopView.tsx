import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { placementToTopView, topViewToPlacement, wrapYaw } from '../../ar/modelSpace';
import { MODEL3D_LIMITS } from '../types';

/**
 * Draufsicht für den Editor von 3D-Modell: Besucher:in in der Mitte, Startblick nach oben. Das Modell
 * (Quadrat) lässt sich ziehen und legt so Richtung und Abstand fest. Reines SVG ohne three.js
 * (Mathe aus src/ar/modelSpace.ts), liegt daher im leichten Editor-Chunk.
 */

interface ModelTopViewProps {
  yaw: number;
  distance_m: number;
  height_m: number;
  /** Startdrehung in Grad (im Uhrzeigersinn) */
  rotation_deg: number;
  onChange: (yaw: number, distance_m: number) => void;
}

/** Zeichenfläche: viewBox −50…50, Besucher:in im Ursprung */
const VIEW = 100;
const HALF = VIEW / 2;
/** Radius des größten Kreisrings (lässt etwas Rand für Beschriftungen) */
const RADIUS = 44;
/** Sichtbare Reichweiten in Metern; die Ansicht springt nur zwischen diesen Stufen, nicht stufenlos */
export const TOP_VIEW_RANGES = [10, 20, 50] as const;
/** Ab diesem Anteil der Reichweite springt die Ansicht beim Ziehen auf die nächste Stufe */
const GROW_AT = 0.9;
const KEY_YAW_STEP = 5;
const KEY_DISTANCE_STEP = 0.5;
/** Halber Öffnungswinkel des Blickkegels (Handykamera etwa 60° breit) */
const CONE_HALF_ANGLE_DEG = 30;
const MIN_SIDE = 4;
const MAX_SIDE = 36;
const RAD = Math.PI / 180;

/** Kleinste Reichweite (10, 20, 50 m), in der Abstand und Modellhöhe Platz haben */
export function topViewRange(distance: number, height: number): number {
  const needed = distance + height;
  return TOP_VIEW_RANGES.find((range) => range >= needed) ?? TOP_VIEW_RANGES[TOP_VIEW_RANGES.length - 1];
}

/** Abstand der Kreisringe: alle 5 m, bei 50 m Reichweite alle 10 m */
const ringStep = (range: number) => (range > 25 ? 10 : 5);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

export function ModelTopView({ yaw, distance_m, height_m, rotation_deg, onChange }: ModelTopViewProps) {
  const { t, language } = useLanguage();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRange = useRef<number | null>(null);
  const [frozenRange, setFrozenRange] = useState<number | null>(null);
  const range = frozenRange ?? topViewRange(distance_m, height_m);
  const scale = RADIUS / range;
  const { min, max } = MODEL3D_LIMITS.distance_m;
  const decimal = (value: number) => (language === 'de' ? String(value).replace('.', ',') : String(value));

  const model = placementToTopView(yaw, distance_m, scale);
  const side = clamp(height_m * scale, MIN_SIDE, MAX_SIDE);
  // Vorderseite des Modells (three.js rotation.y = −rotation_deg; Blickrichtung +Z) in der Draufsicht
  const frontX = -Math.sin(rotation_deg * RAD);
  const frontY = Math.cos(rotation_deg * RAD);
  const frontStart = side / 2;
  const frontEnd = side / 2 + 3.5;

  const rings: number[] = [];
  for (let m = ringStep(range); m <= range; m += ringStep(range)) rings.push(m);

  const coneLength = 24;
  const coneX = Math.sin(CONE_HALF_ANGLE_DEG * RAD) * coneLength;
  const coneY = -Math.cos(CONE_HALF_ANGLE_DEG * RAD) * coneLength;

  /** Zeigerposition in Zeichenflächen-Einheiten (Ursprung = Besucher:in) */
  const toUnits = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const width = rect && rect.width > 0 ? rect.width : VIEW;
    const height = rect && rect.height > 0 ? rect.height : VIEW;
    return {
      x: ((e.clientX - (rect?.left ?? 0)) / width) * VIEW - HALF,
      y: ((e.clientY - (rect?.top ?? 0)) / height) * VIEW - HALF,
    };
  };

  const moveTo = (e: PointerEvent<SVGSVGElement>) => {
    const activeRange = dragRange.current;
    if (activeRange === null) return;
    const { x, y } = toUnits(e);
    const placement = topViewToPlacement(x, y, RADIUS / activeRange, min, max);
    // Nahe am Rand zeigt die Ansicht mehr: nächste Stufe, damit sich auch große Abstände ziehen lassen
    const next = TOP_VIEW_RANGES.find((r) => r > activeRange);
    if (next && placement.distance_m > activeRange * GROW_AT) {
      dragRange.current = next;
      setFrozenRange(next);
    }
    onChange(placement.yaw, placement.distance_m);
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== undefined && e.button > 0) return;
    // Maßstab bleibt beim Ziehen stehen, sonst wandert das Modell unter dem Zeiger davon
    dragRange.current = range;
    setFrozenRange(range);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.currentTarget.focus();
    moveTo(e);
  };

  const endDrag = () => {
    dragRange.current = null;
    setFrozenRange(null);
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    let nextYaw = yaw;
    let nextDistance = distance_m;
    if (e.key === 'ArrowLeft') nextYaw = wrapYaw(yaw - KEY_YAW_STEP);
    else if (e.key === 'ArrowRight') nextYaw = wrapYaw(yaw + KEY_YAW_STEP);
    else if (e.key === 'ArrowUp') nextDistance = clamp(round1(distance_m + KEY_DISTANCE_STEP), min, max);
    else if (e.key === 'ArrowDown') nextDistance = clamp(round1(distance_m - KEY_DISTANCE_STEP), min, max);
    else return;
    e.preventDefault();
    onChange(nextYaw, nextDistance);
  };

  return (
    <div className="space-y-2">
      <svg
        ref={svgRef}
        viewBox={`${-HALF} ${-HALF} ${VIEW} ${VIEW}`}
        role="application"
        aria-label={t('model3dTopViewLabel')}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={moveTo}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        data-testid="model-top-view"
        className="aspect-square w-full max-w-sm cursor-grab touch-none select-none rounded-2xl border border-border bg-muted/60 outline-none focus-visible:ring-4 focus-visible:ring-primary/15 active:cursor-grabbing"
      >
        {rings.map((m) => (
          <g key={m} aria-hidden="true">
            <circle cx={0} cy={0} r={m * scale} className="fill-none stroke-border" strokeWidth={0.4} strokeDasharray="1.2 1.2" />
            <text x={m * scale * 0.7071 + 0.8} y={m * scale * 0.7071 + 3} fontSize={3} className="fill-muted-foreground">
              {t('model3dTopViewMeters', { m })}
            </text>
          </g>
        ))}

        {/* Startblick: Kegel nach oben */}
        <g aria-hidden="true">
          <path d={`M0 0 L${-coneX} ${coneY} A${coneLength} ${coneLength} 0 0 1 ${coneX} ${coneY} Z`} className="fill-primary/10 stroke-primary/40" strokeWidth={0.4} />
          <text x={0} y={-coneLength - 2} textAnchor="middle" fontSize={3.2} className="fill-muted-foreground">
            {t('arDiscoverStartView')}
          </text>
          <circle cx={0} cy={0} r={1.8} className="fill-foreground" />
        </g>

        {/* Modell: Quadrat, Strich = Vorderseite bei der Startdrehung */}
        <g aria-hidden="true" transform={`translate(${model.x} ${model.y})`}>
          <rect x={-side / 2} y={-side / 2} width={side} height={side} rx={2} className="fill-primary stroke-white" strokeWidth={0.8} />
          <line x1={frontX * frontStart} y1={frontY * frontStart} x2={frontX * frontEnd} y2={frontY * frontEnd} className="stroke-primary" strokeWidth={1.2} strokeLinecap="round" />
          <circle cx={frontX * frontEnd} cy={frontY * frontEnd} r={1.1} className="fill-primary" />
        </g>
      </svg>
      <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
        {t('model3dYaw')}: {t('model3dUnitDegrees', { value: decimal(yaw) })} · {t('model3dDistanceShort')}: {t('model3dUnitMeters', { value: decimal(distance_m) })}
      </p>
    </div>
  );
}
