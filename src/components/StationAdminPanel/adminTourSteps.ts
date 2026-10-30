import type { CustomPath, CustomStation } from '../../services/api';

/**
 * Schritte der Einführung in die Stationsverwaltung. Die Tour läuft über Übersicht → einen Pfad →
 * eine Station im Editor; Ziele werden über `data-tour`-Attribute gefunden.
 */

/** Seite, auf der ein Schritt spielt ('any': dort, wo man gerade ist) */
export type TourRouteKind = 'overview' | 'path' | 'station' | 'any';

/** Seiten, die die Tour selbst ansteuert */
export type TourRoute =
  | { kind: 'overview' }
  | { kind: 'path'; pathId: string }
  | { kind: 'station'; pathId: string; stationId: number };

export interface AdminTourStep {
  id: string;
  route: TourRouteKind;
  /** CSS-Selektor des Ziels; fehlt → Karte in der Mitte ohne Hervorhebung */
  target?: string;
  /** Ersatz, wenn das Ziel auf dieser Breite unsichtbar ist (z. B. Seitenleiste auf dem Handy) */
  alt?: { target: string; titleKey: string; textKey: string };
  titleKey: string;
  textKey: string;
  /**
   * Nur zeigen, wenn es … gibt: 'path' einen Themenpfad, 'station' eine Station darin.
   * 'noPath' / 'noStation': Ermutigung, den ersten Pfad bzw. die erste Station anzulegen.
   */
  requires?: 'path' | 'station' | 'noPath' | 'noStation';
}

const tour = (name: string) => `[data-tour="${name}"]`;

export const ADMIN_TOUR_STEPS: AdminTourStep[] = [
  // Übersicht
  { id: 'paths', route: 'overview', target: tour('overview-paths'), titleKey: 'adminTourPathsTitle', textKey: 'adminTourPathsText', requires: 'path' },
  { id: 'new-path', route: 'overview', target: tour('overview-new-path'), titleKey: 'adminTourNewPathTitle', textKey: 'adminTourNewPathText' },
  // Pfadseite
  {
    id: 'navigation',
    route: 'path',
    target: tour('sidebar'),
    alt: { target: tour('breadcrumbs'), titleKey: 'adminTourBreadcrumbsTitle', textKey: 'adminTourBreadcrumbsText' },
    titleKey: 'adminTourSidebarTitle',
    textKey: 'adminTourSidebarText',
  },
  { id: 'path-visibility', route: 'path', target: tour('path-visibility'), titleKey: 'adminTourPathVisibilityTitle', textKey: 'adminTourPathVisibilityText' },
  // Die Karte (AdminMap) ist das einzige Kartenelement direkt auf der Pfadseite
  { id: 'path-map', route: 'path', target: `${tour('path-page')} > [role="application"]`, titleKey: 'adminTourPathMapTitle', textKey: 'adminTourPathMapText', requires: 'station' },
  { id: 'path-stations', route: 'path', target: tour('path-stations'), titleKey: 'adminTourPathStationsTitle', textKey: 'adminTourPathStationsText', requires: 'station' },
  { id: 'new-station', route: 'path', target: tour('path-new-station'), titleKey: 'adminTourNewStationTitle', textKey: 'adminTourNewStationText' },
  // Stationseditor
  { id: 'station-visibility', route: 'station', target: tour('editor-visibility'), titleKey: 'adminTourStationVisibilityTitle', textKey: 'adminTourStationVisibilityText' },
  { id: 'cover', route: 'station', target: tour('editor-cover'), titleKey: 'adminTourCoverTitle', textKey: 'adminTourCoverText' },
  { id: 'location', route: 'station', target: tour('editor-location'), titleKey: 'adminTourLocationTitle', textKey: 'adminTourLocationText' },
  { id: 'modules', route: 'station', target: tour('editor-modules'), titleKey: 'adminTourModulesTitle', textKey: 'adminTourModulesText' },
  { id: 'add-module', route: 'station', target: tour('editor-add-module'), titleKey: 'adminTourAddModuleTitle', textKey: 'adminTourAddModuleText' },
  {
    id: 'preview',
    route: 'station',
    target: tour('editor-preview'),
    alt: { target: tour('editor-preview-button'), titleKey: 'adminTourPreviewButtonTitle', textKey: 'adminTourPreviewButtonText' },
    titleKey: 'adminTourPreviewTitle',
    textKey: 'adminTourPreviewText',
  },
  { id: 'actions', route: 'station', target: tour('editor-actions'), titleKey: 'adminTourActionsTitle', textKey: 'adminTourActionsText' },
  // Ermutigung, wenn es noch nichts zu zeigen gibt
  { id: 'first-path', route: 'any', titleKey: 'adminTourFirstPathTitle', textKey: 'adminTourFirstPathText', requires: 'noPath' },
  { id: 'first-station', route: 'any', titleKey: 'adminTourFirstStationTitle', textKey: 'adminTourFirstStationText', requires: 'noStation' },
  // Zum Schluss: wo man die Tour wiederfindet
  { id: 'help', route: 'any', target: tour('help'), titleKey: 'adminTourHelpTitle', textKey: 'adminTourHelpText' },
];

export interface TourPlan {
  steps: AdminTourStep[];
  /** Pfad und Station, an denen die Tour Pfadseite und Editor zeigt */
  pathId: string | null;
  stationId: number | null;
}

/**
 * Schritte für die vorhandenen Inhalte: Pfadseite und Editor am ersten Pfad mit Stationen
 * (sonst am ersten Pfad); was es nicht gibt, fällt weg.
 */
export function buildTourPlan(paths: CustomPath[], stationsByPath: Map<string, CustomStation[]>): TourPlan {
  const path = paths.find((p) => (stationsByPath.get(p.id)?.length ?? 0) > 0) ?? paths[0] ?? null;
  const station = path ? stationsByPath.get(path.id)?.[0] ?? null : null;
  const steps = ADMIN_TOUR_STEPS.filter((step) => {
    if (step.route === 'path' && !path) return false;
    if (step.route === 'station' && !station) return false;
    switch (step.requires) {
      case 'path': return !!path;
      case 'station': return !!station;
      case 'noPath': return !path;
      case 'noStation': return !!path && !station;
      default: return true;
    }
  });
  return { steps, pathId: path?.id ?? null, stationId: station?.id ?? null };
}

/** Seite, die ein Schritt braucht; null: bleibt, wo man ist */
export function routeForStep(step: AdminTourStep, plan: TourPlan): TourRoute | null {
  if (step.route === 'overview') return { kind: 'overview' };
  if (step.route === 'path' && plan.pathId) return { kind: 'path', pathId: plan.pathId };
  if (step.route === 'station' && plan.pathId && plan.stationId !== null) return { kind: 'station', pathId: plan.pathId, stationId: plan.stationId };
  return null;
}

export function isSameRoute(a: TourRoute, b: { kind: string; pathId?: string; stationId?: number }): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'path') return a.pathId === b.pathId;
  if (a.kind === 'station') return a.pathId === b.pathId && a.stationId === b.stationId;
  return true;
}
