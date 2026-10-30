/**
 * Ungespeicherte Änderungen (Stationsverwaltung). Ein Formular mit Änderungen meldet sich hier an;
 * Navigation innerhalb der Verwaltung zeigt dann einen Dialog, die App-Navigation fragt nach.
 * Bewusst klein und ohne React, damit die App es nutzen kann, ohne den Admin-Chunk zu laden.
 */
export interface UnsavedGuard {
  /** Speichert die Änderungen; true bei Erfolg (false z. B. bei fehlenden Pflichtangaben) */
  save: () => Promise<boolean>;
  /** Verwirft die Änderungen */
  discard: () => void;
}

let current: UnsavedGuard | null = null;

export function setUnsavedGuard(guard: UnsavedGuard | null): void {
  current = guard;
}

export function getUnsavedGuard(): UnsavedGuard | null {
  return current;
}
