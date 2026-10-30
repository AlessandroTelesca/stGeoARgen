import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronRight, Lock, MapPinPlus, Plus, Route } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { customStationImageUrl, type CustomPath, type CustomStation } from '../../services/api';
import { PageIntro } from '../PageHeader';
import { DraftChip, SectionHeader, StationTrail, ease } from './adminUi';

interface AdminOverviewProps {
  paths: CustomPath[];
  stationsByPath: Map<string, CustomStation[]>;
  /** Stationen, deren Pfad es nicht (mehr) als Themenpfad gibt */
  orphanStations: CustomStation[];
  arPath: { title: string; stationCount: number };
  onOpenPath: (pathId: string) => void;
  onNewPath: () => void;
  onOpenStation: (station: CustomStation) => void;
  onMovePath: (index: number, direction: -1 | 1) => void;
}

/** Startseite der Stationsverwaltung: alle Themenpfade mit ihren Stationen auf einen Blick */
export function AdminOverview({ paths, stationsByPath, orphanStations, arPath, onOpenPath, onNewPath, onOpenStation, onMovePath }: AdminOverviewProps) {
  const { t } = useLanguage();
  const allStations = [...stationsByPath.values()].flat();
  const draftCount = allStations.filter((s) => !s.published).length + paths.filter((p) => !p.published).length;

  const stats = [
    { label: t('adminStatPaths'), value: paths.length },
    { label: t('adminStatStations'), value: allStations.length },
    { label: t('adminStatDrafts'), value: draftCount },
  ];

  return (
    <div>
      <PageIntro
        className="mt-2 mb-6"
        title={t('stationEditorTitle')}
        description={t('adminOverviewIntro')}
        icon={<MapPinPlus className="w-6 h-6" />}
      />

      <dl className="grid grid-cols-3 gap-2.5 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="surface-card px-4 py-3.5">
            <dd className="text-[26px] leading-none font-extrabold tabular-nums">{stat.value}</dd>
            <dt className="mt-1.5 text-xs font-semibold text-muted-foreground">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <SectionHeader
        title={t('adminThemePaths')}
        action={
          <button
            type="button"
            onClick={onNewPath}
            className="min-h-[44px] px-4 rounded-full bg-card border border-border shadow-xs text-sm font-bold text-primary flex items-center gap-1.5 hover:border-primary/40 transition-colors pressable"
          >
            <Plus className="w-4 h-4" />
            {t('pathEditorNewPath')}
          </button>
        }
      />

      <ul className="grid sm:grid-cols-2 gap-3">
        {paths.map((path, index) => {
          const stations = stationsByPath.get(path.id) ?? [];
          const drafts = stations.filter((s) => !s.published).length;
          return (
            <motion.li
              key={path.id}
              className="surface-card overflow-hidden flex flex-col group"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 + index * 0.05, duration: 0.42, ease }}
            >
              <button type="button" onClick={() => onOpenPath(path.id)} className="text-left flex-1 flex flex-col focus-visible:ring-4 focus-visible:ring-primary/15 rounded-[20px]">
                <div className="relative aspect-[16/7] bg-primary-soft overflow-hidden">
                  {path.cover_image ? (
                    <img src={customStationImageUrl(path.cover_image)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="absolute inset-0 brand-gradient"><div className="topo-texture absolute inset-0" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/0" aria-hidden="true" />
                  {!path.published && <span className="absolute top-3 left-3"><DraftChip onImage /></span>}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 text-white">
                    <h3 className="text-lg font-extrabold leading-tight drop-shadow-sm line-clamp-2">{path.title_de}</h3>
                    <span className="flex-shrink-0 text-right leading-none">
                      <span className="block text-[26px] font-extrabold tabular-nums">{stations.length}</span>
                      <span className="text-[11px] font-semibold text-white/80">{t('stations')}</span>
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <StationTrail stations={stations} />
                  <p className="text-xs text-muted-foreground">
                    {[
                      t(`pathEditorDifficulty${path.difficulty}`),
                      path.estimated_time || null,
                      drafts > 0 ? t('adminDraftCount', { count: drafts }) : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </button>
              {paths.length > 1 && (
                <div className="flex items-center justify-between border-t border-border px-2 py-1">
                  <span className="pl-2 text-xs font-semibold text-muted-foreground tabular-nums">{t('adminPathPosition', { n: index + 1 })}</span>
                  <span className="flex">
                    <button type="button" onClick={() => onMovePath(index, -1)} disabled={index === 0} aria-label={t('adminMoveUp')} className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => onMovePath(index, 1)} disabled={index === paths.length - 1} aria-label={t('adminMoveDown')} className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </span>
                </div>
              )}
            </motion.li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={onNewPath}
            className="w-full h-full min-h-[200px] rounded-[20px] border-2 border-dashed border-border-strong flex flex-col items-center justify-center gap-2 px-6 py-8 text-center hover:border-primary hover:bg-primary-soft/40 transition-colors"
          >
            <span className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center"><Route className="w-6 h-6" /></span>
            <span className="font-bold">{t('pathEditorNewPath')}</span>
            <span className="text-sm text-muted-foreground max-w-[16rem]">{t('adminNewPathHint')}</span>
          </button>
        </li>
      </ul>

      {/* Fest eingebauter AR-Pfad */}
      <div className="mt-3 surface-card p-4 flex items-center gap-3.5">
        <span className="w-11 h-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0"><Lock className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold">{arPath.title}</h3>
          <p className="text-sm text-muted-foreground leading-snug">{t('pathEditorArLocked')}</p>
        </div>
        <span className="text-right leading-none flex-shrink-0">
          <span className="block text-xl font-extrabold tabular-nums">{arPath.stationCount}</span>
          <span className="text-[11px] font-semibold text-muted-foreground">{t('stations')}</span>
        </span>
      </div>

      {orphanStations.length > 0 && (
        <div className="mt-10">
          <SectionHeader title={t('adminOrphanStations')} count={orphanStations.length} />
          <p className="px-1 mb-3 text-sm text-muted-foreground">{t('adminOrphanStationsHint')}</p>
          <ul className="space-y-2">
            {orphanStations.map((station) => (
              <li key={station.id}>
                <button type="button" onClick={() => onOpenStation(station)} className="w-full surface-card p-3 flex items-center gap-3 text-left hover:shadow-md transition-shadow">
                  <span className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {station.cover_image && <img src={customStationImageUrl(station.cover_image)} alt="" className="w-full h-full object-cover" />}
                  </span>
                  <span className="flex-1 min-w-0 font-bold truncate">{station.title_de}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
