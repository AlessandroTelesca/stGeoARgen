import { EyeOff, LayoutGrid, Lock, Plus } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { customStationImageUrl, type CustomPath, type CustomStation } from '../../services/api';

interface AdminSidebarProps {
  paths: CustomPath[];
  stationsByPath: Map<string, CustomStation[]>;
  arPath: { title: string; stationCount: number };
  activePathId: string | null;
  activeStationId: number | null;
  onOverview: () => void;
  onOpenPath: (pathId: string) => void;
  onOpenStation: (station: CustomStation) => void;
  onNewPath: () => void;
  draftStationIds: Set<number>;
}

/**
 * Pfad-Baum der Stationsverwaltung (breite Bildschirme): jeder Pfad mit der Zahl seiner
 * Stationen; der geöffnete Pfad klappt seine Stationen in Wegreihenfolge auf.
 */
export function AdminSidebar({
  paths,
  stationsByPath,
  arPath,
  activePathId,
  activeStationId,
  onOverview,
  onOpenPath,
  onOpenStation,
  onNewPath,
  draftStationIds,
}: AdminSidebarProps) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t('adminSidebarLabel')} className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain surface-card p-2">
      <button
        type="button"
        onClick={onOverview}
        aria-current={activePathId === null ? 'page' : undefined}
        className={`w-full min-h-[44px] px-3 rounded-xl flex items-center gap-2.5 text-sm font-bold transition-colors ${activePathId === null ? 'bg-primary-soft text-primary' : 'hover:bg-muted'}`}
      >
        <LayoutGrid className="w-4 h-4" />
        {t('adminOverview')}
      </button>

      <p className="mt-3 mb-1 px-3 text-xs font-semibold text-muted-foreground">{t('adminThemePaths')}</p>
      <ul className="space-y-0.5">
        {paths.map((path) => {
          const stations = stationsByPath.get(path.id) ?? [];
          const active = path.id === activePathId;
          return (
            <li key={path.id}>
              <button
                type="button"
                onClick={() => onOpenPath(path.id)}
                aria-current={active && activeStationId === null ? 'page' : undefined}
                aria-expanded={active}
                className={`w-full min-h-[48px] px-2 rounded-xl flex items-center gap-2.5 text-left transition-colors ${active ? 'bg-primary-soft' : 'hover:bg-muted'}`}
              >
                <span className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 brand-gradient">
                  {path.cover_image && <img src={customStationImageUrl(path.cover_image)} alt="" className="w-full h-full object-cover" />}
                </span>
                <span className={`flex-1 min-w-0 truncate text-sm font-semibold ${active ? 'text-primary-dark' : ''}`}>
                  {path.title_de}
                </span>
                {!path.published && <EyeOff className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" aria-label={t('adminDraft')} />}
                <span className={`min-w-7 h-6 px-1.5 rounded-full text-xs font-bold tabular-nums flex items-center justify-center ${active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  {stations.length}
                </span>
              </button>
              {active && stations.length > 0 && (
                <ol className="relative ml-6 my-1 pl-3 border-l-2 border-primary/15 space-y-0.5">
                  {stations.map((station, index) => {
                    const current = station.id === activeStationId;
                    return (
                      <li key={station.id}>
                        <button
                          type="button"
                          onClick={() => onOpenStation(station)}
                          aria-current={current ? 'page' : undefined}
                          className={`w-full min-h-[44px] px-2 rounded-lg flex items-center gap-2 text-left text-sm transition-colors ${current ? 'bg-card shadow-xs font-bold text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                        >
                          <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold tabular-nums ${station.published ? 'bg-primary text-white' : 'border-[1.5px] border-dashed border-border-strong'}`}>
                            {index + 1}
                          </span>
                          <span className="flex-1 min-w-0 truncate">{station.title_de}</span>
                          {draftStationIds.has(station.id) && <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" title={t('adminUnsavedChanges')} />}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
        <li className="flex items-center gap-2.5 min-h-[44px] px-2 text-sm text-muted-foreground">
          <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Lock className="w-4 h-4" /></span>
          <span className="flex-1 min-w-0 truncate">{arPath.title}</span>
          <span className="min-w-7 h-6 px-1.5 rounded-full bg-muted text-xs font-bold tabular-nums flex items-center justify-center">{arPath.stationCount}</span>
        </li>
      </ul>

      <button
        type="button"
        onClick={onNewPath}
        className="mt-2 w-full min-h-[44px] px-3 rounded-xl flex items-center gap-2.5 text-sm font-bold text-primary hover:bg-primary-soft transition-colors"
      >
        <Plus className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{t('adminNewPathShort')}</span>
      </button>
    </nav>
  );
}
