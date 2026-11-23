import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Check } from 'lucide-react';
import './ar.css';

/**
 * Entdeckbare Punkte über der AR-Bühne. Jeder Punkt ist ein Button (Antippen öffnet sofort –
 * gleichwertige Alternative zum Anvisieren). Positionen setzt die Bühne pro Frame imperativ über
 * `place()`, ohne React neu zu rendern; nur „gefunden“ kommt als Prop.
 */

export interface ArMarker {
  id: string;
  /** Beschriftung für Screenreader und Tooltip */
  label: string;
  /** Laufende Nummer im Kreis */
  number: number;
  found: boolean;
  size?: 'small' | 'medium' | 'large';
}

export interface ArMarkerLayerHandle {
  /** Bildschirmposition (Container-Pixel) je Punkt; unsichtbare werden ausgeblendet */
  place(id: string, x: number, y: number, visible: boolean): void;
  /** Gerade anvisierter Punkt (oder null) */
  setAimed(id: string | null): void;
}

interface ArMarkerLayerProps {
  markers: ArMarker[];
  onOpen: (id: string) => void;
}

export const ArMarkerLayer = forwardRef<ArMarkerLayerHandle, ArMarkerLayerProps>(function ArMarkerLayer({ markers, onOpen }, ref) {
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const aimed = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    place(id, x, y, visible) {
      const el = nodes.current.get(id);
      if (!el) return;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      if (el.dataset.visible !== String(visible)) {
        el.dataset.visible = String(visible);
        el.tabIndex = visible ? 0 : -1;
      }
    },
    setAimed(id) {
      if (aimed.current === id) return;
      if (aimed.current) nodes.current.get(aimed.current)?.removeAttribute('data-aimed');
      if (id) nodes.current.get(id)?.setAttribute('data-aimed', 'true');
      aimed.current = id;
    },
  }), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {markers.map((m) => (
        <button
          key={m.id}
          ref={(el) => {
            if (el) nodes.current.set(m.id, el);
            else nodes.current.delete(m.id);
          }}
          type="button"
          data-visible="false"
          data-found={m.found ? 'true' : 'false'}
          data-size={m.size ?? 'medium'}
          tabIndex={-1}
          onClick={() => onOpen(m.id)}
          aria-label={m.label}
          title={m.label}
          className="ar-marker pointer-events-auto absolute left-0 top-0"
        >
          <span className="ar-marker__halo" aria-hidden="true" />
          <span className="ar-marker__core" aria-hidden="true">
            {m.found ? <Check className="w-4 h-4" strokeWidth={3} /> : m.number}
          </span>
        </button>
      ))}
    </div>
  );
});
