import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ComponentType, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ImagePlus,
  LocateFixed,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { FieldLabel } from '../AuthShell';
import { Switch } from '../Settings';
import { Input } from '../ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  apiAdminDeleteStation,
  apiAdminSaveStation,
  customStationImageUrl,
  type CustomPath,
  type CustomStation,
  type CustomStationInput,
} from '../../services/api';
import { MAX_MODULES_PER_STATION, mapModuleMedia, pickLang, type MediaKind, type StationModule } from '../../stationModules/types';
import { MODULE_META, type DraftMedia, type DraftModule } from '../../stationModules/meta';
import { MODULE_EDITORS } from '../../stationModules/editor/registry';
import type { ModuleEditorProps, ModuleErrors } from '../../stationModules/editor/types';
import { LocalizedInput, LocalizedTextarea } from '../../stationModules/editor/fields';
import { StationModulePlayer } from '../../stationModules/player/StationModulePlayer';
import type { ARChromeProps } from '../../stationModules/player/contract';
import { FieldError, FormSection, SubmitFeedback, inputClass, useScrollToFirstError, type ImageItem } from './adminFormParts';
import { ConfirmDialog, DraftChip, ease } from './adminUi';
import { AdminMap, type MapMarker } from './AdminMap';
import { ModuleLibrary } from './ModuleLibrary';
import { PhonePreview } from './PhonePreview';

/** Formularzustand einer Station (bleibt beim Wechseln zwischen Seiten der Verwaltung erhalten) */
export interface StationDraft {
  pathId: string;
  titleDe: string;
  titleEn: string | null;
  descriptionDe: string;
  descriptionEn: string | null;
  longDescriptionDe: string;
  longDescriptionEn: string | null;
  points: string;
  latitude: string;
  longitude: string;
  cover: ImageItem | null;
  published: boolean;
  modules: DraftModule[];
}

type BaseErrors = Partial<Record<'pathId' | 'titleDe' | 'descriptionDe' | 'longDescriptionDe' | 'points' | 'location' | 'cover' | 'modules', string>>;

/** Reihenfolge für die Fehlerliste über dem Speichern-Button */
const BASE_ERROR_LABELS: Record<keyof BaseErrors, string> = {
  cover: 'stationEditorSectionCover',
  titleDe: 'stationEditorName',
  descriptionDe: 'stationEditorShortDescription',
  longDescriptionDe: 'stationEditorLongDescription',
  modules: 'adminSectionModules',
  location: 'stationEditorSectionLocation',
  pathId: 'stationEditorPath',
  points: 'points',
};

export function draftFromStation(station: CustomStation): StationDraft {
  const existing = (filename: string): ImageItem => ({ kind: 'existing', filename, url: customStationImageUrl(filename) });
  return {
    pathId: station.path_id,
    titleDe: station.title_de,
    titleEn: station.title_en,
    descriptionDe: station.description_de,
    descriptionEn: station.description_en,
    longDescriptionDe: station.long_description_de,
    longDescriptionEn: station.long_description_en,
    points: String(station.points),
    latitude: String(station.latitude),
    longitude: String(station.longitude),
    cover: station.cover_image ? existing(station.cover_image) : null,
    published: station.published,
    modules: station.modules.map((m) => mapModuleMedia<string, DraftMedia>(m, (file) => (file ? existing(file) : null))),
  };
}

export function emptyStationDraft(pathId: string, modules: DraftModule[], defaultPoints: number | undefined): StationDraft {
  return {
    pathId,
    titleDe: '',
    titleEn: null,
    descriptionDe: '',
    descriptionEn: null,
    longDescriptionDe: '',
    longDescriptionEn: null,
    points: defaultPoints === undefined ? '' : String(defaultPoints),
    latitude: '',
    longitude: '',
    cover: null,
    published: false,
    modules,
  };
}

function parseCoordinate(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '' || !/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Vor dem Speichern: leere Eingabezeilen aus Vorlagen entfernen */
function sanitizeModule(module: DraftModule): DraftModule {
  if (module.type === 'onsite_code') return { ...module, answers: module.answers.map((a) => a.trim()).filter(Boolean) };
  return module;
}

/** Erstes Bild eines Moduls für die Miniatur im Modulkopf */
function moduleThumb(module: DraftModule): string | null {
  let url = null as string | null;
  mapModuleMedia(module, (item, kind) => {
    if (!url && item && kind !== 'audio') url = item.url;
    return item;
  });
  return url;
}

interface StationEditorProps {
  adminPassword: string;
  /** null = neue Station */
  station: CustomStation | null;
  /** Ausgangszustand (gespeicherte Station bzw. Vorlage) */
  pristine: StationDraft;
  /** Ungespeicherte Änderungen von einem früheren Besuch dieser Seite */
  savedDraft: StationDraft | null;
  onDraftChange: (draft: StationDraft | null) => void;
  paths: CustomPath[];
  /** Alle Stationen (für die Karte der Nachbarstationen im Pfad) */
  allStations: CustomStation[];
  prepareMedia: (file: File, kind: MediaKind) => Promise<ImageItem | null>;
  onSaved: (station: CustomStation) => Promise<void>;
  onDeleted: (station: CustomStation) => Promise<void>;
  onOpenStation: (station: CustomStation) => void;
  arChrome: ARChromeProps;
}

export function StationEditor({
  adminPassword,
  station,
  pristine,
  savedDraft,
  onDraftChange,
  paths,
  allStations,
  prepareMedia,
  onSaved,
  onDeleted,
  onOpenStation,
  arChrome,
}: StationEditorProps) {
  const { t, language } = useLanguage();
  const [draft, setDraft] = useState<StationDraft>(savedDraft ?? pristine);
  const [restored, setRestored] = useState(savedDraft !== null);
  const [dirty, setDirty] = useState(savedDraft !== null);
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [errors, setErrors] = useState<BaseErrors>({});
  const [moduleErrors, setModuleErrors] = useState<Record<string, ModuleErrors>>({});
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(station ? [] : draft.modules.slice(0, 1).map((m) => m.id)));
  const [activeIndex, setActiveIndex] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [removeModuleId, setRemoveModuleId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const scrollToFirstError = useScrollToFirstError(formRef);
  const pendingScrollId = useRef<string | null>(null);

  /** Jede Änderung: Formular aktualisieren und als ungespeicherten Entwurf merken */
  const update = (apply: (prev: StationDraft) => StationDraft) => {
    setDraft((prev) => apply(prev));
    setDirty(true);
  };
  useEffect(() => {
    if (dirty) onDraftChange(draft);
  }, [draft, dirty, onDraftChange]);

  // Seite verlassen (Tab schließen/neu laden) mit ungespeicherten Änderungen → Browser fragt nach
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Neu hinzugefügtes Modul in den sichtbaren Bereich holen
  useEffect(() => {
    if (!pendingScrollId.current) return;
    document.getElementById(`module-${pendingScrollId.current}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    pendingScrollId.current = null;
  });

  const isEn = lang === 'en';
  const lat = parseCoordinate(draft.latitude);
  const lng = parseCoordinate(draft.longitude);
  const hasArModule = draft.modules.some((m) => m.type === 'ar_panorama');
  const title = pickLang(lang, draft.titleDe, draft.titleEn);

  // Andere Stationen im gewählten Pfad als Kartenkontext, nummeriert in Pfadreihenfolge
  const pathStations = useMemo(
    () => allStations.filter((s) => s.path_id === draft.pathId).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [allStations, draft.pathId]
  );
  const ownIndex = station ? pathStations.findIndex((s) => s.id === station.id) : -1;
  const ownLabel = String((ownIndex >= 0 ? ownIndex : pathStations.length) + 1);
  const mapMarkers: MapMarker[] = useMemo(
    () => pathStations.map((s, i) => ({ id: s.id, lat: s.latitude, lng: s.longitude, label: String(i + 1), title: s.title_de, published: s.published })),
    [pathStations]
  );
  const mapEditable = useMemo(
    () => ({
      value: lat !== null && lng !== null ? { lat, lng } : null,
      label: ownLabel,
      onChange: (pos: { lat: number; lng: number }) => {
        update((prev) => ({ ...prev, latitude: String(pos.lat), longitude: String(pos.lng) }));
        setErrors((prev) => ({ ...prev, location: undefined }));
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lat, lng, ownLabel]
  );

  // Vorschau: Module mit Vorschau-URLs (neue Dateien als Objekt-URL, fehlende als '')
  const previewModules = useMemo(
    () => draft.modules.map((m) => mapModuleMedia<DraftMedia, string>(m, (item) => item?.url ?? '') as StationModule<string>),
    [draft.modules]
  );
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, draft.modules.length - 1));

  // ─── Module ───────────────────────────────────────────────────────────────
  const setModule = (id: string, apply: (prev: DraftModule) => DraftModule) => {
    update((prev) => ({ ...prev, modules: prev.modules.map((m) => (m.id === id ? apply(m) : m)) }));
  };

  const addModule = (module: DraftModule) => {
    update((prev) => ({ ...prev, modules: [...prev.modules, module] }));
    setOpenIds((prev) => new Set(prev).add(module.id));
    setActiveIndex(draft.modules.length);
    setLibraryOpen(false);
    setErrors((prev) => ({ ...prev, modules: undefined }));
    pendingScrollId.current = module.id;
  };

  const moveModule = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.modules.length) return;
    update((prev) => {
      const modules = [...prev.modules];
      [modules[index], modules[target]] = [modules[target], modules[index]];
      return { ...prev, modules };
    });
    setActiveIndex(target);
  };

  const removeModule = (id: string) => {
    update((prev) => ({ ...prev, modules: prev.modules.filter((m) => m.id !== id) }));
    setModuleErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRemoveModuleId(null);
  };

  const toggleOpen = (id: string, index: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActiveIndex(index);
  };

  // ─── Medien, Standort ─────────────────────────────────────────────────────
  const handleCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (coverInputRef.current) coverInputRef.current.value = '';
    if (!file) return;
    const item = await prepareMedia(file, 'image');
    if (!item) return;
    update((prev) => ({ ...prev, cover: item }));
    setErrors((prev) => ({ ...prev, cover: undefined }));
  };

  const handleCoordinatePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pair = e.clipboardData.getData('text').match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!pair) return;
    e.preventDefault();
    update((prev) => ({ ...prev, latitude: pair[1], longitude: pair[2] }));
  };

  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error(t('stationEditorLocationUnavailable'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update((prev) => ({ ...prev, latitude: position.coords.latitude.toFixed(7), longitude: position.coords.longitude.toFixed(7) }));
        setErrors((prev) => ({ ...prev, location: undefined }));
        setLocating(false);
        toast.success(t('stationEditorLocationApplied', { accuracy: Math.round(position.coords.accuracy) }));
      },
      () => {
        setLocating(false);
        toast.error(t('stationEditorLocationUnavailable'));
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // ─── Prüfen + Speichern ───────────────────────────────────────────────────
  const validate = (): { base: BaseErrors; modules: Record<string, ModuleErrors> } => {
    const base: BaseErrors = {};
    if (!paths.some((p) => p.id === draft.pathId)) base.pathId = t('stationEditorErrorPath');
    if (!draft.titleDe.trim()) base.titleDe = t('stationEditorErrorRequired');
    if (!draft.descriptionDe.trim()) base.descriptionDe = t('stationEditorErrorRequired');
    if (!draft.longDescriptionDe.trim()) base.longDescriptionDe = t('stationEditorErrorRequired');
    if (!/^\d+$/.test(draft.points.trim()) || Number(draft.points) > 1000) base.points = t('stationEditorErrorPoints');
    if (lat === null || lat < -90 || lat > 90 || lng === null || lng < -180 || lng > 180) base.location = t('adminErrorLocation');
    if (!draft.cover) base.cover = t('stationEditorErrorCover');
    if (draft.modules.length === 0) base.modules = t('adminErrorNoModules');
    const modules: Record<string, ModuleErrors> = {};
    draft.modules.forEach((m) => {
      const definition = MODULE_EDITORS[m.type] as unknown as { validate: (module: DraftModule, translate: typeof t) => ModuleErrors };
      const result = definition.validate(m, t);
      if (Object.keys(result).length > 0) modules[m.id] = result;
    });
    return { base, modules };
  };

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault();
    const result = validate();
    setErrors(result.base);
    setModuleErrors(result.modules);
    setSaveError(null);
    const invalidModules = Object.keys(result.modules);
    if (Object.keys(result.base).length > 0 || invalidModules.length > 0) {
      setLang('de');
      setOpenIds((prev) => new Set([...prev, ...invalidModules]));
      scrollToFirstError();
      return;
    }

    const files: File[] = [];
    const toRef = (item: DraftMedia): string => {
      if (!item) return '';
      if (item.kind === 'existing') return item.filename;
      files.push(item.file);
      return `new:${files.length - 1}`;
    };
    const cover = draft.cover!;
    const payload: CustomStationInput = {
      id: station?.id,
      path_id: draft.pathId,
      title_de: draft.titleDe.trim(),
      title_en: draft.titleEn?.trim() || null,
      description_de: draft.descriptionDe.trim(),
      description_en: draft.descriptionEn?.trim() || null,
      long_description_de: draft.longDescriptionDe.trim(),
      long_description_en: draft.longDescriptionEn?.trim() || null,
      cover_image: cover.kind === 'existing' ? cover.filename : 'new',
      modules: draft.modules.map((m) => mapModuleMedia<DraftMedia, string>(sanitizeModule(m), toRef) as StationModule),
      points: Number(draft.points),
      latitude: lat!,
      longitude: lng!,
      published: draft.published,
    };

    setSaving(true);
    try {
      const saved = await apiAdminSaveStation(adminPassword, payload, cover.kind === 'new' ? cover.file : null, files);
      setDirty(false);
      onDraftChange(null);
      toast.success(station ? t('stationEditorUpdated') : t('stationEditorCreated'), { description: saved.title_de });
      await onSaved(saved);
    } catch (err) {
      setSaveError(err instanceof Error && err.message ? err.message : t('stationEditorSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!station) return;
    setDeleting(true);
    try {
      await apiAdminDeleteStation(adminPassword, station.id);
      setDirty(false);
      onDraftChange(null);
      toast.success(t('stationEditorDeleted'), { description: station.title_de });
      await onDeleted(station);
    } catch (err) {
      toast.error(t('stationEditorDeleteFailed'), { description: err instanceof Error ? err.message : undefined });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const discardChanges = () => {
    setDraft(pristine);
    setDirty(false);
    setRestored(false);
    setErrors({});
    setModuleErrors({});
    onDraftChange(null);
  };

  const errorItems = [
    ...(Object.keys(BASE_ERROR_LABELS) as (keyof BaseErrors)[]).filter((key) => errors[key]).map((key) => t(BASE_ERROR_LABELS[key])),
    ...draft.modules
      .map((m, i) => (moduleErrors[m.id] ? `${t('adminModuleNumber', { n: i + 1 })} · ${t(MODULE_META[m.type].labelKey)}` : null))
      .filter((x): x is string => x !== null),
  ];
  const removeTarget = draft.modules.find((m) => m.id === removeModuleId);

  return (
    <div>
      {restored && (
        <motion.div
          className="mb-4 rounded-2xl bg-gold-soft border border-gold/25 px-4 py-3 flex items-center gap-3"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="w-5 h-5 text-gold flex-shrink-0" />
          <p className="flex-1 text-sm text-gold-foreground">{t('adminDraftRestored')}</p>
          <button
            type="button"
            onClick={discardChanges}
            className="min-h-[40px] px-3 rounded-xl text-sm font-bold text-gold-foreground hover:bg-gold/15 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('adminDiscardChanges')}
          </button>
        </motion.div>
      )}

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8 xl:items-start">
        <form ref={formRef} onSubmit={handleSave} className="space-y-5 min-w-0" noValidate>
          {/* Auftritt: Titelbild + Texte, so wie die Station in der App erscheint */}
          <section className="surface-card overflow-hidden">
            <div className={`relative aspect-[16/9] sm:aspect-[2/1] bg-muted ${errors.cover ? 'ring-2 ring-inset ring-destructive' : ''}`}>
              {draft.cover ? (
                <img src={draft.cover.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 topo-texture opacity-60" aria-hidden="true" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/0 to-black/70" aria-hidden="true" />
              <div className="absolute top-3 left-3 flex gap-1.5">{!draft.published && <DraftChip onImage />}</div>
              <label
                className={`absolute cursor-pointer focus-within:ring-4 focus-within:ring-white/50 flex items-center gap-2 font-bold transition-colors ${draft.cover
                  ? 'top-3 right-3 h-10 px-3.5 rounded-full bg-black/45 backdrop-blur-md text-white text-sm hover:bg-black/60'
                  : 'inset-0 m-auto w-fit h-fit flex-col px-6 py-4 rounded-2xl bg-card/95 text-primary shadow-md hover:bg-card'}`}
              >
                <ImagePlus className="w-5 h-5" />
                <span>{draft.cover ? t('stationEditorChangeCover') : t('stationEditorChooseCover')}</span>
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void handleCover(e.target.files)} />
              </label>
              <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
                <p className={`text-[26px] leading-[1.1] font-extrabold tracking-tight text-white drop-shadow-sm ${title ? '' : 'opacity-60'}`}>
                  {title || t('stationEditorNamePlaceholder')}
                </p>
              </div>
            </div>
            {errors.cover && <div className="px-5 pt-1"><FieldError message={errors.cover} /></div>}
            <div className="p-5 space-y-5">
              <LocalizedInput
                id="station-title"
                label={t('stationEditorName')}
                lang={lang}
                required
                de={draft.titleDe}
                en={draft.titleEn}
                onChange={(de, en) => update((prev) => ({ ...prev, titleDe: de, titleEn: en }))}
                maxLength={150}
                placeholder={t('stationEditorNamePlaceholder')}
                error={errors.titleDe}
              />
              <LocalizedInput
                id="station-description"
                label={t('stationEditorShortDescription')}
                lang={lang}
                required
                de={draft.descriptionDe}
                en={draft.descriptionEn}
                onChange={(de, en) => update((prev) => ({ ...prev, descriptionDe: de, descriptionEn: en }))}
                maxLength={255}
                placeholder={t('stationEditorShortDescriptionPlaceholder')}
                hint={t('stationEditorShortDescriptionHint')}
                error={errors.descriptionDe}
              />
              <LocalizedTextarea
                id="station-long-description"
                label={t('stationEditorLongDescription')}
                lang={lang}
                required
                de={draft.longDescriptionDe}
                en={draft.longDescriptionEn}
                onChange={(de, en) => update((prev) => ({ ...prev, longDescriptionDe: de, longDescriptionEn: en }))}
                maxLength={20000}
                rows={6}
                placeholder={t('stationEditorLongDescriptionPlaceholder')}
                hint={t('adminLongDescriptionHint')}
                error={errors.longDescriptionDe}
              />
            </div>
          </section>

          {/* Ablauf: Module in Reihenfolge */}
          <section aria-labelledby="modules-title">
            <div className="flex items-end justify-between gap-3 px-1 mb-3 mt-8">
              <div>
                <h2 id="modules-title" className="text-lg font-bold tracking-tight">
                  {t('adminSectionModules')}
                  <span className="ml-2 text-muted-foreground font-semibold tabular-nums">{draft.modules.length}</span>
                </h2>
                <p className="text-sm text-muted-foreground leading-snug">{t('adminModulesIntro')}</p>
              </div>
            </div>

            {draft.modules.length === 0 ? (
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                aria-invalid={!!errors.modules}
                className={`w-full flex flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-6 py-10 text-center transition-colors hover:border-primary hover:bg-primary-soft/40 ${errors.modules ? 'border-destructive' : 'border-border-strong'}`}
              >
                <span className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center"><Plus className="w-6 h-6" /></span>
                <span className="font-bold">{t('adminAddFirstModule')}</span>
                <span className="text-sm text-muted-foreground max-w-sm">{t('adminAddFirstModuleHint')}</span>
              </button>
            ) : (
              <ol className="space-y-0">
                {draft.modules.map((module, index) => {
                  const meta = MODULE_META[module.type];
                  const Icon = meta.icon;
                  const definition = MODULE_EDITORS[module.type] as unknown as {
                    Editor: ComponentType<ModuleEditorProps<typeof module.type>>;
                    summary: (m: DraftModule, translate: typeof t) => string;
                  };
                  const Editor = definition.Editor;
                  const open = openIds.has(module.id);
                  const errs = moduleErrors[module.id] ?? {};
                  const hasErrors = Object.keys(errs).length > 0;
                  const thumb = moduleThumb(module);
                  const customTitle = pickLang(lang, module.title_de, module.title_en);
                  const isActive = index === safeActiveIndex;
                  return (
                    <li key={module.id}>
                      {index > 0 && <div className="ml-[27px] h-4 border-l-2 border-dotted border-border-strong" aria-hidden="true" />}
                      <div
                        id={`module-${module.id}`}
                        className={`surface-card overflow-hidden scroll-mt-24 transition-shadow ${hasErrors ? 'ring-2 ring-destructive/50' : isActive ? 'xl:ring-2 xl:ring-primary/30' : ''}`}
                        onFocusCapture={() => setActiveIndex(index)}
                      >
                        <div className="flex items-center gap-2 p-2.5 sm:p-3">
                          <button
                            type="button"
                            onClick={() => toggleOpen(module.id, index)}
                            aria-expanded={open}
                            aria-controls={`module-body-${module.id}`}
                            aria-invalid={hasErrors || undefined}
                            className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-xl p-0.5 focus-visible:ring-4 focus-visible:ring-primary/15"
                          >
                            <span className="relative w-14 h-14 rounded-xl overflow-hidden bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                              {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <Icon className="w-6 h-6" />}
                              <span className="absolute top-1 left-1 min-w-5 h-5 px-1 rounded-full bg-foreground/85 text-white text-[11px] font-bold tabular-nums flex items-center justify-center">{index + 1}</span>
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                {thumb && <Icon className="w-3.5 h-3.5" />}
                                {t(meta.labelKey)}
                              </span>
                              <span className="block font-bold truncate">{customTitle || definition.summary(module, t)}</span>
                              {customTitle && <span className="block text-xs text-muted-foreground truncate">{definition.summary(module, t)}</span>}
                            </span>
                            {hasErrors && <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" aria-label={t('adminModuleHasErrors')} />}
                            <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                          </button>
                          <div className="flex items-center flex-shrink-0">
                            <button type="button" onClick={() => moveModule(index, -1)} disabled={index === 0} aria-label={t('adminMoveUp')} className="w-10 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => moveModule(index, 1)} disabled={index === draft.modules.length - 1} aria-label={t('adminMoveDown')} className="w-10 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setRemoveModuleId(module.id)} aria-label={t('adminRemoveModule')} className="w-10 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              id={`module-body-${module.id}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border px-4 sm:px-5 py-5 space-y-5">
                                <LocalizedInput
                                  id={`${module.id}-title`}
                                  label={t('adminModuleTitle')}
                                  lang={lang}
                                  de={module.title_de}
                                  en={module.title_en}
                                  onChange={(de, en) => setModule(module.id, (prev) => ({ ...prev, title_de: de, title_en: en }))}
                                  maxLength={120}
                                  placeholder={t(meta.labelKey)}
                                />
                                <Editor
                                  module={module}
                                  onChange={(apply) => setModule(module.id, apply as (prev: DraftModule) => DraftModule)}
                                  lang={lang}
                                  errors={errs}
                                  prepareMedia={prepareMedia}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            <FieldError message={errors.modules} />
            {draft.modules.length > 0 && (
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                disabled={draft.modules.length >= MAX_MODULES_PER_STATION}
                className="mt-4 w-full min-h-[52px] bg-card text-primary border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary-soft/40 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors pressable disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                {t('adminAddModule')}
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">{draft.modules.length} / {MAX_MODULES_PER_STATION}</span>
              </button>
            )}
          </section>

          {/* Standort */}
          <div className="pt-3">
            <FormSection title={t('stationEditorSectionLocation')} description={t('adminLocationIntro')}>
              <AdminMap
                markers={mapMarkers}
                showRoute
                activeId={station?.id ?? null}
                editable={mapEditable}
                onMarkerClick={(id) => {
                  const other = pathStations.find((s) => s.id === id);
                  if (other && other.id !== station?.id) onOpenStation(other);
                }}
                className={`h-[300px] sm:h-[360px] ${errors.location ? 'ring-2 ring-destructive' : ''}`}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="station-lat">{t('stationEditorLatitude')}</FieldLabel>
                  <Input id="station-lat" inputMode="decimal" value={draft.latitude} onChange={(e) => update((prev) => ({ ...prev, latitude: e.target.value }))} onPaste={handleCoordinatePaste} placeholder="48.1258" className={`${inputClass(!!errors.location)} tabular-nums`} aria-invalid={!!errors.location} />
                </div>
                <div>
                  <FieldLabel htmlFor="station-lng">{t('stationEditorLongitude')}</FieldLabel>
                  <Input id="station-lng" inputMode="decimal" value={draft.longitude} onChange={(e) => update((prev) => ({ ...prev, longitude: e.target.value }))} onPaste={handleCoordinatePaste} placeholder="8.3333" className={`${inputClass(!!errors.location)} tabular-nums`} aria-invalid={!!errors.location} />
                </div>
              </div>
              <FieldError message={errors.location} />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="w-full min-h-[48px] bg-card text-primary border-2 border-primary/25 hover:border-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors pressable disabled:opacity-60"
              >
                {locating ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <LocateFixed className="w-5 h-5" />}
                <span>{t('stationEditorUseCurrentLocation')}</span>
              </button>
            </FormSection>
          </div>

          {/* Einstellungen */}
          <FormSection title={t('adminSectionSettings')}>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
              <div className="min-w-0">
                <span className="font-bold">{t('adminPublishedLabel')}</span>
                <p className="text-sm text-muted-foreground leading-snug">{draft.published ? t('adminPublishedOnHint') : t('adminPublishedOffHint')}</p>
              </div>
              <Switch checked={draft.published} onChange={() => update((prev) => ({ ...prev, published: !prev.published }))} label={t('adminPublishedLabel')} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="station-path">{t('stationEditorPath')}</FieldLabel>
                <select
                  id="station-path"
                  value={draft.pathId}
                  onChange={(e) => update((prev) => ({ ...prev, pathId: e.target.value }))}
                  className={`w-full h-14 px-4 rounded-2xl border bg-card font-semibold focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary ${errors.pathId ? 'border-destructive' : 'border-input'}`}
                  aria-invalid={!!errors.pathId}
                >
                  {!paths.some((p) => p.id === draft.pathId) && <option value={draft.pathId} disabled>{t('stationEditorChoosePath')}</option>}
                  {paths.map((path) => <option key={path.id} value={path.id}>{path.title_de}</option>)}
                </select>
                <FieldError message={errors.pathId} />
              </div>
              <div>
                <FieldLabel htmlFor="station-points">{t('points')}</FieldLabel>
                <Input
                  id="station-points"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000}
                  step={10}
                  value={draft.points}
                  onChange={(e) => update((prev) => ({ ...prev, points: e.target.value }))}
                  className={`${inputClass(!!errors.points)} tabular-nums`}
                  aria-invalid={!!errors.points}
                />
                <FieldError message={errors.points} />
              </div>
            </div>
            {hasArModule && <p className="text-xs text-muted-foreground">{t('adminArModuleHint')}</p>}
          </FormSection>

          {saveError ? (
            <SubmitFeedback title={`${t('stationEditorSaveFailed')}: ${saveError}`} />
          ) : (
            <SubmitFeedback title={errorItems.length > 0 ? t('stationEditorFixErrors') : null} items={[...new Set(errorItems)]} />
          )}

          {station && (
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-destructive flex items-center gap-2 hover:bg-destructive/8 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('adminDeleteStation')}
              </button>
            </div>
          )}
        </form>

        {/* Live-Vorschau (breite Bildschirme) */}
        <aside className="hidden xl:block sticky top-24" aria-label={t('adminPreviewTitle')}>
          <PhonePreview stationTitle={title} modules={previewModules} activeIndex={safeActiveIndex} onSelect={setActiveIndex} lang={lang} />
        </aside>
      </div>

      {/* Aktionsleiste: Sprache, Vorschau, Speichern – bleibt unten sichtbar */}
      <div
        className="sticky bottom-0 z-20 -mx-4 mt-6 px-4 pt-3 border-t border-border bg-background/90 backdrop-blur-md"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 flex-shrink-0" role="tablist" aria-label={t('adminTextLanguage')}>
            {(['de', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={lang === l}
                onClick={() => setLang(l)}
                className={`h-11 px-3 rounded-xl text-sm font-bold uppercase transition-colors ${lang === l ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={draft.modules.length === 0}
            aria-label={t('adminPreviewOpen')}
            className="min-h-[52px] px-4 rounded-2xl bg-card text-primary border-2 border-primary/25 hover:border-primary font-bold flex items-center justify-center gap-2 transition-colors pressable disabled:opacity-50"
          >
            <Play className="w-5 h-5" fill="currentColor" />
            <span className="hidden sm:inline">{t('adminPreviewOpen')}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 min-h-[52px] rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable disabled:opacity-70 disabled:shadow-none"
          >
            {saving ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('stationEditorSaving')}
              </>
            ) : (
              <>
                {dirty && <span className="w-2 h-2 rounded-full bg-gold-bright" aria-hidden="true" />}
                {station ? t('stationEditorSaveChanges') : t('stationEditorCreate')}
              </>
            )}
          </button>
        </div>
      </div>

      <ModuleLibrary
        open={libraryOpen}
        disabledTypes={draft.modules.filter((m) => MODULE_META[m.type].singleton).map((m) => m.type)}
        onClose={() => setLibraryOpen(false)}
        onAdd={addModule}
      />

      <ConfirmDialog
        open={removeTarget !== undefined}
        title={t('adminRemoveModuleTitle')}
        text={removeTarget ? t('adminRemoveModuleText', { name: t(MODULE_META[removeTarget.type].labelKey) }) : ''}
        confirmLabel={t('adminRemoveModule')}
        onCancel={() => setRemoveModuleId(null)}
        onConfirm={() => removeModuleId && removeModule(removeModuleId)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t('adminDeleteStationTitle')}
        text={t('adminDeleteStationText', { name: station?.title_de ?? '' })}
        confirmLabel={t('stationEditorDelete')}
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />

      {previewOpen && createPortal(
        <StationModulePlayer
          station={{ id: station?.id ?? 0, title: title || t('adminNewStation'), latitude: lat ?? 0, longitude: lng ?? 0, points: Number(draft.points) || 0, modules: previewModules }}
          lang={lang === 'en' ? 'en' : language}
          arChrome={arChrome}
          preview
          canComplete={false}
          isGuest={false}
          onClose={() => setPreviewOpen(false)}
        />,
        document.body
      )}
    </div>
  );
}
