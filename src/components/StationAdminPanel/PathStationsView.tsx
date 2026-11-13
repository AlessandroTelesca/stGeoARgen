import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronRight, Clock, Eye, EyeOff, Gauge, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { customStationImageUrl, type CustomPath, type CustomStation } from '../../services/api';
import { Switch } from '../Settings';
import { AdminMap, type MapMarker } from './AdminMap';
import { ConfirmDialog, DraftChip, ModuleIconRow, PointsChip, SectionHeader, ease } from './adminUi';

interface PathStationsViewProps {
  /** null: Pfad ist kein Themenpfad der Verwaltung (z. B. ältere Stationen im AR-Pfad) */
  path: CustomPath | null;
  title: string;
  stations: CustomStation[];
  /** Stationen mit ungespeicherten Änderungen */
  draftStationIds: Set<number>;
  onOpenStation: (station: CustomStation) => void;
  onNewStation: () => void;
  onEditPath: () => void;
  onTogglePublished: () => Promise<void>;
  onDeletePath: () => Promise<void>;
  onMoveStation: (index: number, direction: -1 | 1) => void;
}

/** Ein Themenpfad mit seinen Stationen als Spur – wie der Weg, den Besucher:innen gehen */
export function PathStationsView({
  path,
  title,
  stations,
  draftStationIds,
  onOpenStation,
  onNewStation,
  onEditPath,
  onTogglePublished,
  onDeletePath,
  onMoveStation,
}: PathStationsViewProps) {
  const { t } = useLanguage();
  const [toggling, setToggling] = useState(false);
  /** Pfad sichtbar machen bzw. verbergen wirkt sofort für alle – deshalb erst bestätigen */
  const [confirmPublish, setConfirmPublish] = useState(false);
  const draftStations = stations.filter((s) => !s.published).length;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const markers: MapMarker[] = useMemo(
    () => stations.map((s, i) => ({ id: s.id, lat: s.latitude, lng: s.longitude, label: String(i + 1), title: s.title_de, published: s.published, color: s.color })),
    [stations]
  );

  const togglePublished = async () => {
    setToggling(true);
    try {
      await onTogglePublished();
    } finally {
      setToggling(false);
    }
  };

  return (
    <div data-tour="path-page">
      {/* Pfadkopf */}
      {path ? (
        <section className="surface-card overflow-hidden mt-2">
          <div className="sm:flex">
            <div className="relative sm:w-[42%] aspect-[16/8] sm:aspect-auto sm:min-h-[220px] bg-primary-soft flex-shrink-0">
              {path.cover_image ? (
                <img src={customStationImageUrl(path.cover_image)} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 brand-gradient"><div className="topo-texture absolute inset-0" /></div>
              )}
              {!path.published && <span className="absolute top-3 left-3"><DraftChip onImage /></span>}
            </div>
            <div className="p-5 flex-1 min-w-0 flex flex-col">
              <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-tight">{path.title_de}</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground line-clamp-3">{path.description_de}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-muted-foreground">
                <li className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><MapPin className="w-3.5 h-3.5" /><span className="tabular-nums">{t(stations.length === 1 ? 'adminStationCountOne' : 'adminStationCountOther', { count: stations.length })}</span></li>
                <li className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Gauge className="w-3.5 h-3.5" />{t(`pathEditorDifficulty${path.difficulty}`)}</li>
                {path.estimated_time && <li className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Clock className="w-3.5 h-3.5" />{path.estimated_time}</li>}
              </ul>
              <div className="mt-auto pt-5 flex flex-wrap items-center gap-2">
                <button type="button" onClick={onEditPath} className="min-h-[44px] px-4 rounded-xl bg-muted font-semibold flex items-center gap-2 hover:bg-secondary transition-colors">
                  <Pencil className="w-4 h-4" />
                  {t('adminEditPath')}
                </button>
                {stations.length === 0 && (
                  <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-[44px] px-4 rounded-xl font-semibold text-destructive flex items-center gap-2 hover:bg-destructive/8 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    {t('stationEditorDelete')}
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Sichtbarkeit */}
          <div data-tour="path-visibility" className={`flex items-center gap-3.5 px-5 py-4 border-t ${path.published ? 'border-border' : 'border-gold/25 bg-gold-soft'}`}>
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${path.published ? 'bg-primary-soft text-primary' : 'bg-gold/15 text-gold'}`}>
              {path.published ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold ${path.published ? '' : 'text-gold-foreground'}`}>{path.published ? t('adminPathPublished') : t('adminPathDraft')}</p>
              <p className={`text-sm leading-snug ${path.published ? 'text-muted-foreground' : 'text-gold-foreground/80'}`}>
                {path.published ? t('adminPathPublishedHint') : t('adminPathDraftHint')}
              </p>
            </div>
            <Switch checked={path.published} onChange={() => setConfirmPublish(true)} disabled={toggling} label={t('adminPublishedLabel')} />
          </div>
        </section>
      ) : (
        <div className="mt-2">
          <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('adminOrphanStationsHint')}</p>
        </div>
      )}

      {/* Karte mit Wegverlauf */}
      {stations.length > 0 && (
        <AdminMap
          markers={markers}
          showRoute
          onMarkerClick={(id) => {
            const station = stations.find((s) => s.id === id);
            if (station) onOpenStation(station);
          }}
          className="mt-5 h-[260px] sm:h-[320px] shadow-sm"
        />
      )}

      {/* Stationsspur */}
      <div className="mt-8">
        <SectionHeader
          title={t('stations')}
          count={stations.length}
          action={path && stations.length > 0 ? (
            <button type="button" onClick={onNewStation} data-tour="path-new-station" className="min-h-[44px] px-4 rounded-full bg-primary text-white text-sm font-bold flex items-center gap-1.5 shadow-primary hover:bg-primary-dark transition-colors pressable">
              <Plus className="w-4 h-4" />
              {t('stationEditorNewStation')}
            </button>
          ) : undefined}
        />

        {stations.length === 0 ? (
          <button
            type="button"
            onClick={onNewStation}
            disabled={!path}
            data-tour="path-new-station"
            className="w-full flex flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-border-strong px-6 py-12 text-center hover:border-primary hover:bg-primary-soft/40 transition-colors"
          >
            <span className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center"><Plus className="w-6 h-6" /></span>
            <span className="font-bold">{t('adminFirstStation')}</span>
            <span className="text-sm text-muted-foreground max-w-sm">{t('adminFirstStationHint')}</span>
          </button>
        ) : (
          <ol data-tour="path-stations" className="relative">
            {stations.map((station, index) => (
              <motion.li
                key={station.id}
                className="relative flex gap-3 pb-3 last:pb-0"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 + index * 0.05, duration: 0.42, ease }}
              >
                {/* Weg + Nummer */}
                <div className="relative w-9 flex-shrink-0 flex justify-center">
                  {index < stations.length - 1 && <span className="absolute top-9 -bottom-3 w-0.5 bg-primary/20" aria-hidden="true" />}
                  <span
                    className={`relative mt-3 w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold tabular-nums ${station.published ? 'bg-primary text-white shadow-primary' : 'bg-card border-2 border-dashed border-border-strong text-muted-foreground'}`}
                  >
                    {index + 1}
                  </span>
                </div>

                <div className="flex-1 min-w-0 surface-card flex items-stretch overflow-hidden hover:shadow-md transition-shadow">
                  <button type="button" onClick={() => onOpenStation(station)} className="flex-1 min-w-0 flex gap-3 sm:gap-3.5 p-3 text-left focus-visible:ring-4 focus-visible:ring-primary/15 rounded-[20px]">
                    <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                      {station.cover_image && <img src={customStationImageUrl(station.cover_image)} alt="" width={80} height={80} loading="lazy" className="w-full h-full object-cover" />}
                    </span>
                    <span className="flex-1 min-w-0 py-0.5">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-bold">{station.title_de}</span>
                        {draftStationIds.has(station.id) && <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" title={t('adminUnsavedChanges')} />}
                      </span>
                      <span className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{station.description_de}</span>
                      <span className="mt-2 flex items-center gap-2 flex-wrap">
                        <ModuleIconRow types={station.modules.map((m) => m.type)} />
                        <PointsChip points={station.points} />
                        {!station.published && <DraftChip />}
                      </span>
                    </span>
                    <ChevronRight className="hidden sm:block self-center w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </button>
                  {stations.length > 1 && (
                    <div className="flex flex-col justify-center border-l border-border px-0.5">
                      <button type="button" onClick={() => onMoveStation(index, -1)} disabled={index === 0} aria-label={t('adminMoveUp')} className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => onMoveStation(index, 1)} disabled={index === stations.length - 1} aria-label={t('adminMoveDown')} className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </ol>
        )}
      </div>

      {path && (
        <ConfirmDialog
          open={confirmPublish}
          tone="primary"
          icon={path.published ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
          title={path.published ? t('adminConfirmHideTitle') : t('adminConfirmPublishTitle')}
          text={path.published
            ? t('adminConfirmHideText')
            : stations.length - draftStations === 0
              ? t('adminConfirmPublishTextNone')
              : draftStations > 0
                ? t('adminConfirmPublishTextDrafts', { count: stations.length - draftStations, drafts: draftStations })
                : t('adminConfirmPublishText', { count: stations.length })}
          confirmLabel={path.published ? t('adminConfirmHide') : t('adminConfirmPublish')}
          busy={toggling}
          onCancel={() => setConfirmPublish(false)}
          onConfirm={async () => {
            await togglePublished();
            setConfirmPublish(false);
          }}
        />
      )}

      {path && (
        <ConfirmDialog
          open={confirmDelete}
          title={t('adminDeletePathTitle')}
          text={t('adminDeletePathText', { name: path.title_de })}
          confirmLabel={t('stationEditorDelete')}
          busy={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setDeleting(true);
            try {
              await onDeletePath();
            } finally {
              setDeleting(false);
              setConfirmDelete(false);
            }
          }}
        />
      )}
    </div>
  );
}
