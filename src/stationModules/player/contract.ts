import type { StationModule } from '../types';
import type { StationCoordinates } from '../../data/stationsConfig';

/** Daten für die AR-Oberfläche (Top-Bar, Profilmenü, Fortschrittsleiste) wie in den AR-Stationen */
export interface ARChromeProps {
  username: string | null;
  onNavigateHome: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onNavigateProfile: () => void;
  onRegister: () => void;
  completedStations: number;
  totalStations: number;
  totalPoints: number;
}

/** Station, wie sie der Player abspielt: Titel in der aktuellen Sprache, Module mit fertigen Medien-URLs */
export interface PlayerStation {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  points: number;
  /** Akzentfarbe der Station (#rrggbb); null → Standard-Tannengrün */
  color?: string | null;
  modules: StationModule<string>[];
}

export interface StationModulePlayerProps {
  station: PlayerStation;
  lang: 'de' | 'en';
  arChrome: ARChromeProps;
  /** Vorschau aus der Stationsverwaltung: kein Abschluss, keine Standort-/Gerätepflicht */
  preview?: boolean;
  /** Station darf jetzt abgeschlossen werden (eingeloggt und noch nicht erledigt) */
  canComplete: boolean;
  /** Gast-Modus: Station erleben, aber keine Punkte */
  isGuest: boolean;
  /** Letztes Modul fertig und canComplete → Station abschließen (Punkte vergeben) */
  onCompleteStation?: (stationId: number) => void;
  /** Player verlassen (Schließen-Button, nach dem Abschluss, Ende der Vorschau) */
  onClose: () => void;
  /** Im Admin-Handyrahmen eingebettet: kein Fokusfang, kein globales Escape, keine Dialog-Rolle */
  embedded?: boolean;
  /** Gesteuerter Modus: aktuelles Modul von außen vorgeben (zusammen mit onIndexChange) */
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Ziel für Dialoge im eingebetteten Modus */
  portalContainer?: HTMLElement | null;
  /** Nächste Stationen im aktuellen Pfad (für den Abschlussdialog) */
  nextStations?: StationCoordinates[];
}
