import type { ComponentType } from 'react';
import type { ImageItem } from '../../components/StationAdminPanel/adminFormParts';
import type { DraftModuleOfType } from '../meta';
import type { MediaKind, ModuleType } from '../types';

/**
 * Vertrag zwischen der Stationsverwaltung (Modul-Liste, Speichern) und den Editoren je Modultyp.
 * Die Verwaltung rendert Kopf, Überschrift-Feld, Sprachumschalter und Sortierung eines Moduls;
 * der Editor nur die typspezifischen Felder.
 */

/** Fehler eines Moduls: Feldpfad → Meldung, z. B. "before_image", "slides.2.text_de", "questions.0" */
export type ModuleErrors = Record<string, string>;

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface ModuleEditorProps<T extends ModuleType> {
  module: DraftModuleOfType<T>;
  /** Änderung als Updater (sicher bei asynchroner Bildaufbereitung) */
  onChange: (update: (prev: DraftModuleOfType<T>) => DraftModuleOfType<T>) => void;
  /** Sprache der Textfelder; Englisch ist überall optional (leer → deutscher Text) */
  lang: 'de' | 'en';
  /** Fehler der letzten Prüfung (leer = alles in Ordnung oder noch nicht geprüft) */
  errors: ModuleErrors;
  /**
   * Bereitet eine gewählte Datei vor (Format prüfen, Bilder verkleinern, Vorschau-URL anlegen).
   * null, wenn die Datei abgelehnt wurde (Meldung hat die Verwaltung schon gezeigt).
   */
  prepareMedia: (file: File, kind: MediaKind) => Promise<ImageItem | null>;
}

export interface ModuleEditorDefinition<T extends ModuleType> {
  Editor: ComponentType<ModuleEditorProps<T>>;
  /** Prüft das Modul vor dem Speichern (nur Pflichtangaben auf Deutsch, Englisch ist optional) */
  validate: (module: DraftModuleOfType<T>, t: Translate) => ModuleErrors;
  /** Kurze Inhaltsangabe für den zugeklappten Modulkopf, z. B. "4 Bilder" oder "Quiz · 3 Fragen" */
  summary: (module: DraftModuleOfType<T>, t: Translate) => string;
}

export type ModuleEditorRegistry = { [T in ModuleType]: ModuleEditorDefinition<T> };
