import { mapModuleMedia } from '../../stationModules/types';
import type { DraftMedia } from '../../stationModules/meta';
import type { ImageItem } from './adminFormParts';
import type { StationDraft } from './StationEditor';

/**
 * Ungespeicherte Stationsentwürfe im Browser (IndexedDB) – überstehen Neuladen, Tab-Schließen
 * und Abstürze. IndexedDB speichert auch die gewählten Dateien (File), sodass neue Bilder und
 * Tonaufnahmen erhalten bleiben. Fehler (privater Modus, voller Speicher) werden ignoriert:
 * die Verwaltung funktioniert dann wie ohne Sicherung.
 */

const DB_NAME = 'st-geoargen-admin';
const STORE = 'station-drafts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(request ? request.result : undefined);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Objekt-URLs gelten nur bis zum Neuladen – für gespeicherte Dateien neu anlegen */
function refreshUrls(draft: StationDraft, track: (url: string) => void): StationDraft {
  const refresh = (item: DraftMedia): DraftMedia => {
    if (!item || item.kind !== 'new') return item;
    const url = URL.createObjectURL(item.file);
    track(url);
    return { ...item, url };
  };
  return {
    ...draft,
    cover: refresh(draft.cover) as ImageItem | null,
    modules: draft.modules.map((m) => mapModuleMedia<DraftMedia, DraftMedia>(m, refresh)),
  };
}

export async function loadPersistedDrafts(track: (url: string) => void): Promise<Record<string, StationDraft>> {
  try {
    const db = await openDb();
    const result: Record<string, StationDraft> = {};
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const cursorRequest = tx.objectStore(STORE).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const stored = cursor.value as StationDraft;
        // Ältere Entwürfe kennen noch keine Akzentfarbe
        result[String(cursor.key)] = refreshUrls({ ...stored, color: stored.color ?? null }, track);
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return result;
  } catch {
    return {};
  }
}

const pending = new Map<string, ReturnType<typeof setTimeout>>();

/** Entwurf sichern (gebündelt, damit nicht jeder Tastendruck schreibt); null löscht ihn */
export function persistDraft(key: string, draft: StationDraft | null): void {
  const timer = pending.get(key);
  if (timer) clearTimeout(timer);
  if (draft === null) {
    pending.delete(key);
    void withStore('readwrite', (store) => store.delete(key)).catch(() => undefined);
    return;
  }
  pending.set(key, setTimeout(() => {
    pending.delete(key);
    void withStore('readwrite', (store) => store.put(draft, key)).catch(() => undefined);
  }, 400));
}

export function clearPersistedDrafts(): void {
  pending.forEach((timer) => clearTimeout(timer));
  pending.clear();
  void withStore('readwrite', (store) => store.clear()).catch(() => undefined);
}
