import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Karte der Stationsverwaltung (Leaflet + OpenStreetMap, nur im Admin-Bereich geladen).
 * Zeigt die Stationen eines Pfads als nummerierte Marker, verbunden in Wegreihenfolge.
 * Mit `editable` lässt sich der Standort einer Station per Tippen oder Ziehen setzen.
 */

export interface MapMarker {
  id: number | string;
  lat: number;
  lng: number;
  /** Nummer im Marker (Position im Pfad) */
  label: string;
  title: string;
  published: boolean;
}

interface AdminMapProps {
  markers: MapMarker[];
  /** Marker in Reihenfolge mit einer Linie verbinden (Pfadverlauf) */
  showRoute?: boolean;
  /** Hervorgehobener Marker (z. B. die gerade bearbeitete Station) */
  activeId?: number | string | null;
  onMarkerClick?: (id: number | string) => void;
  /** Standort der bearbeiteten Station: Tippen auf die Karte bzw. Ziehen setzt ihn */
  editable?: {
    value: { lat: number; lng: number } | null;
    label: string;
    onChange: (position: { lat: number; lng: number }) => void;
  };
  className?: string;
}

/** Ortsmitte St. Georgen als Startpunkt, wenn noch nichts gesetzt ist */
const DEFAULT_CENTER: L.LatLngTuple = [48.1258, 8.3333];

function markerIcon(label: string, variant: 'published' | 'draft' | 'active' | 'edit'): L.DivIcon {
  const styles = {
    published: 'bg-primary text-white border-white',
    draft: 'bg-card text-muted-foreground border-border-strong border-dashed',
    active: 'bg-gold text-gold-foreground border-white scale-110',
    edit: 'bg-gold text-gold-foreground border-white scale-110',
  }[variant];
  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<span class="flex w-[34px] h-[34px] items-center justify-center rounded-full border-2 text-[13px] font-extrabold tabular-nums shadow-md ${styles}">${label}</span>`,
  });
}

export function AdminMap({ markers, showRoute = false, activeId = null, onMarkerClick, editable, className = '' }: AdminMapProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const editMarkerRef = useRef<L.Marker | null>(null);
  const fittedRef = useRef(false);
  // Aktuelle Callbacks für Leaflet-Ereignisse, ohne die Karte neu aufzubauen
  const editableRef = useRef(editable);
  editableRef.current = editable;
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;

  // Karte einmalig anlegen
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(map);
    map.setView(DEFAULT_CENTER, 15);
    map.on('click', (e: L.LeafletMouseEvent) => {
      editableRef.current?.onChange({ lat: Number(e.latlng.lat.toFixed(7)), lng: Number(e.latlng.lng.toFixed(7)) });
    });
    // Mausrad erst nach dem ersten Klick in die Karte, damit die Seite normal scrollt
    map.once('focus', () => map.scrollWheelZoom.enable());
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Größe nach dem Einblenden der Seite neu berechnen
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      editMarkerRef.current = null;
    };
  }, []);

  // Marker + Pfadlinie
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const others = markers.filter((m) => !editable || m.id !== activeId);
    if (showRoute && markers.length > 1) {
      const line = markers.map((m): L.LatLngTuple => {
        if (editable && m.id === activeId && editable.value) return [editable.value.lat, editable.value.lng];
        return [m.lat, m.lng];
      });
      L.polyline(line, { className: 'stroke-primary', weight: 4, opacity: 0.55, dashArray: '2 8', lineCap: 'round' }).addTo(layer);
    }
    others.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], {
        icon: markerIcon(m.label, m.id === activeId ? 'active' : m.published ? 'published' : 'draft'),
        title: m.title,
        keyboard: true,
        riseOnHover: true,
      }).addTo(layer);
      marker.bindTooltip(m.title, { direction: 'top', offset: [0, -16] });
      marker.on('click', () => onMarkerClickRef.current?.(m.id));
    });

    // Beim ersten Anzeigen auf alle Punkte zoomen
    if (!fittedRef.current) {
      const points: L.LatLngTuple[] = markers.map((m) => [m.lat, m.lng]);
      if (editable?.value) points.push([editable.value.lat, editable.value.lng]);
      if (points.length === 1) map.setView(points[0], 17);
      else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
      if (points.length > 0) fittedRef.current = true;
    }
  }, [markers, showRoute, activeId, editable]);

  // Ziehbarer Marker der bearbeiteten Station
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const value = editable?.value ?? null;
    if (!editable || !value) {
      editMarkerRef.current?.remove();
      editMarkerRef.current = null;
      return;
    }
    if (!editMarkerRef.current) {
      const marker = L.marker([value.lat, value.lng], { icon: markerIcon(editable.label, 'edit'), draggable: true, keyboard: true, zIndexOffset: 1000 }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        editableRef.current?.onChange({ lat: Number(pos.lat.toFixed(7)), lng: Number(pos.lng.toFixed(7)) });
      });
      editMarkerRef.current = marker;
      if (!fittedRef.current) {
        map.setView([value.lat, value.lng], 17);
        fittedRef.current = true;
      }
    } else {
      editMarkerRef.current.setLatLng([value.lat, value.lng]);
      editMarkerRef.current.setIcon(markerIcon(editable.label, 'edit'));
    }
  }, [editable]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={editable ? t('adminMapEditLabel') : t('adminMapLabel')}
      className={`relative z-0 overflow-hidden rounded-2xl bg-muted ${editable ? 'cursor-crosshair' : ''} ${className}`}
    />
  );
}
