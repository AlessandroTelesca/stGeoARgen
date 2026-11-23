import { MODULE_META } from '../meta';
import type { StationModule } from '../types';
import { stableHash } from '../../lib/stableHash';

/** Fehlen Inhalte, die ein Player zum Anzeigen braucht (leere Listen, fehlende Medien)? */
export function moduleMissingContent(m: StationModule<string>): boolean {
  switch (m.type) {
    case 'slideshow': return m.slides.length === 0;
    case 'quiz': return m.questions.length === 0;
    case 'timeline': return m.entries.length === 0;
    case 'audio': return m.audio === '';
    case 'hotspots': return m.image === '';
    case 'before_after': return m.before_image === '';
    case 'ar_discover': return m.points.length === 0 || (m.background === 'panorama' && !m.panorama_image);
    case 'model3d': return m.model === '' || (m.background === 'panorama' && !m.panorama_image);
    default: return false;
  }
}

/** Schlüssel, deren Textwerte die Struktur des Moduls bestimmen (Typ, Darstellung, Kennung) */
const STRUCTURAL_KEYS = new Set(['type', 'mode', 'style', 'input', 'background', 'frame', 'camera', 'preset', 'id']);

/**
 * Fingerabdruck der Modulstruktur ohne Freitexte: reine Textänderungen ergeben denselben Schlüssel
 * (der Player behält seinen Zustand), neue Fragen, andere richtige Antworten oder Grenzwerte einen
 * anderen (der Player baut sich neu auf). Bei Modulen mit `immersive`-Flag zählen nur Kennung,
 * Typ und Hintergrund.
 */
export function moduleStructureKey(m: StationModule<string>): string {
  // Module mit WebGL-Bühne (immersive): Punktverschiebungen (Zahlen!) und Texte dürfen die Session nicht neu aufbauen
  if ((MODULE_META as Record<string, { immersive?: true } | undefined>)[m.type]?.immersive) return stableHash(JSON.stringify({ id: m.id, type: m.type, background: (m as { background?: string }).background ?? null }));
  return stableHash(JSON.stringify(m, (key, value) => (typeof value === 'string' && !STRUCTURAL_KEYS.has(key) ? '' : value)));
}
