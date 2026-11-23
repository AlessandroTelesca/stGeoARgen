import type { CustomPath } from '../../services/api';
import { MAX_MODULES_PER_STATION } from '../../stationModules/types';
import { MODULE_META, type DraftModule } from '../../stationModules/meta';
import { MODULE_EDITORS } from '../../stationModules/editor/registry';
import type { ModuleErrors } from '../../stationModules/editor/types';
import type { ImageItem } from './adminFormParts';

export type BaseErrors = Partial<Record<'pathId' | 'titleDe' | 'descriptionDe' | 'longDescriptionDe' | 'points' | 'location' | 'cover' | 'modules', string>>;

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Felder des Formulars, die die Prüfung braucht */
interface ValidatableDraft {
  pathId: string;
  titleDe: string;
  descriptionDe: string;
  longDescriptionDe: string;
  points: string;
  cover: ImageItem | null;
  modules: DraftModule[];
}

/** Vor dem Speichern prüfen: Fehler der Station und je Modul (nach Modul-ID) */
export function validateStationDraft(
  draft: ValidatableDraft,
  options: { paths: CustomPath[]; lat: number | null; lng: number | null; t: Translate }
): { base: BaseErrors; modules: Record<string, ModuleErrors> } {
  const { paths, lat, lng, t } = options;
  const base: BaseErrors = {};
  if (!paths.some((p) => p.id === draft.pathId)) base.pathId = t('stationEditorErrorPath');
  if (!draft.titleDe.trim()) base.titleDe = t('stationEditorErrorRequired');
  if (!draft.descriptionDe.trim()) base.descriptionDe = t('stationEditorErrorRequired');
  if (!draft.longDescriptionDe.trim()) base.longDescriptionDe = t('stationEditorErrorRequired');
  if (!/^\d+$/.test(draft.points.trim()) || Number(draft.points) > 1000) base.points = t('stationEditorErrorPoints');
  if (lat === null || lat < -90 || lat > 90 || lng === null || lng < -180 || lng > 180) base.location = t('adminErrorLocation');
  if (!draft.cover) base.cover = t('stationEditorErrorCover');

  if (draft.modules.length === 0) {
    base.modules = t('adminErrorNoModules');
  } else {
    const problems: string[] = [];
    if (draft.modules.length > MAX_MODULES_PER_STATION) {
      problems.push(t('stationPreviewErrorTooManyModules', { max: MAX_MODULES_PER_STATION }));
    }
    const seen = new Set<string>();
    const repeated = new Set<string>();
    draft.modules.forEach((m) => {
      if (!MODULE_META[m.type]?.singleton) return;
      if (seen.has(m.type)) repeated.add(m.type);
      seen.add(m.type);
    });
    repeated.forEach((type) => {
      problems.push(t('stationPreviewErrorSingleton', { module: t(MODULE_META[type as DraftModule['type']].labelKey) }));
    });
    if (problems.length > 0) base.modules = problems.join(' ');
  }

  const modules: Record<string, ModuleErrors> = {};
  draft.modules.forEach((m) => {
    const definition = MODULE_EDITORS[m.type] as unknown as { validate: (module: DraftModule, translate: Translate) => ModuleErrors } | undefined;
    // Unbekannte Typen (z. B. aus einer neueren Version) überspringen statt abzustürzen
    if (!definition) return;
    const result = definition.validate(m, t);
    if (Object.keys(result).length > 0) modules[m.id] = result;
  });
  return { base, modules };
}
