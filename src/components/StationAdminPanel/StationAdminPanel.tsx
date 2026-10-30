import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LockKeyhole, LogOut, RotateCw, Settings as SettingsIcon } from 'lucide-react';
import { BackLink, PageIntro } from '../PageHeader';
import { FieldLabel } from '../AuthShell';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePointConfig } from '../../contexts/PointConfigContext';
import {
  apiAdminDeletePath,
  apiAdminGetContent,
  apiAdminReorder,
  apiAdminSetPublished,
  apiAdminVerify,
  type CustomPath,
  type CustomStation,
} from '../../services/api';
import { STATION_TEMPLATES, modulesFromTemplate } from '../../stationModules/meta';
import type { MediaKind } from '../../stationModules/types';
import type { ARChromeProps } from '../../stationModules/player/contract';
import { FieldError, MAX_PANORAMA_EDGE, prepareImage, type ImageItem } from './adminFormParts';
import { Breadcrumbs, type Crumb } from './adminUi';
import { AdminOverview } from './AdminOverview';
import { AdminSidebar } from './AdminSidebar';
import { PathAdminForm } from './PathAdminForm';
import { PathStationsView } from './PathStationsView';
import { StationEditor, draftFromStation, emptyStationDraft, type StationDraft } from './StationEditor';
import { StationTemplatePicker } from './StationTemplatePicker';

const ADMIN_SESSION_KEY = 'st-geoargen-admin-password';
const BASE = '/admin/stations';
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

/** Seiten der Stationsverwaltung – jede hat eine eigene URL (Zurück-Taste, Lesezeichen, Breadcrumbs) */
type AdminRoute =
  | { kind: 'overview' }
  | { kind: 'newPath' }
  | { kind: 'path'; pathId: string }
  | { kind: 'editPath'; pathId: string }
  | { kind: 'pickTemplate'; pathId: string }
  | { kind: 'newStation'; pathId: string; templateId: string }
  | { kind: 'station'; pathId: string; stationId: number };

function parseRoute(pathname: string): AdminRoute {
  const rest = pathname.replace(/\/+$/, '').slice(BASE.length).split('/').filter(Boolean).map(decodeURIComponent);
  if (rest[0] === 'new-path') return { kind: 'newPath' };
  if (rest[0] === 'p' && rest[1]) {
    const pathId = rest[1];
    if (rest[2] === 'edit') return { kind: 'editPath', pathId };
    if (rest[2] === 'new') return rest[3] ? { kind: 'newStation', pathId, templateId: rest[3] } : { kind: 'pickTemplate', pathId };
    if (rest[2] === 's' && /^\d+$/.test(rest[3] ?? '')) return { kind: 'station', pathId, stationId: Number(rest[3]) };
    return { kind: 'path', pathId };
  }
  return { kind: 'overview' };
}

function routeUrl(route: AdminRoute): string {
  const p = (id: string) => `${BASE}/p/${encodeURIComponent(id)}`;
  switch (route.kind) {
    case 'overview': return BASE;
    case 'newPath': return `${BASE}/new-path`;
    case 'path': return p(route.pathId);
    case 'editPath': return `${p(route.pathId)}/edit`;
    case 'pickTemplate': return `${p(route.pathId)}/new`;
    case 'newStation': return `${p(route.pathId)}/new/${route.templateId}`;
    case 'station': return `${p(route.pathId)}/s/${route.stationId}`;
  }
}

interface StationAdminPanelProps {
  /** Lädt die öffentlichen Pfade/Stationen der App neu, nachdem etwas gespeichert wurde */
  onDataChanged: () => Promise<void>;
  onBack: () => void;
  /** Fest eingebauter AR-Pfad (nur Anzeige) */
  arPath: { title: string; stationCount: number };
  /** AR-Oberfläche für die Vollbild-Vorschau */
  arChrome: ARChromeProps;
}

export function StationAdminPanel({ onDataChanged, onBack, arPath, arChrome }: StationAdminPanelProps) {
  const { t } = useLanguage();
  const { config: pointConfig } = usePointConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const route = parseRoute(location.pathname);

  const [adminPassword, setAdminPassword] = useState<string | null>(() => sessionStorage.getItem(ADMIN_SESSION_KEY));
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [content, setContent] = useState<{ paths: CustomPath[]; stations: CustomStation[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Ungespeicherte Stationsentwürfe je Seite – bleiben beim Wechseln innerhalb der Verwaltung erhalten */
  const [drafts, setDrafts] = useState<Record<string, StationDraft>>({});
  /** Ausgangszustand neuer Stationen je Vorlage (stabil, damit Modul-IDs gleich bleiben) */
  const newPristineRef = useRef<Record<string, StationDraft>>({});
  const objectUrlsRef = useRef<string[]>([]);
  useEffect(() => () => objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const go = useCallback((next: AdminRoute, replace = false) => navigate(routeUrl(next), { replace }), [navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // ─── Login ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!stored) return;
    apiAdminVerify(stored).catch(() => {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      setAdminPassword(null);
    });
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    setLoggingIn(true);
    setLoginError(null);
    try {
      await apiAdminVerify(passwordInput);
      sessionStorage.setItem(ADMIN_SESSION_KEY, passwordInput);
      setAdminPassword(passwordInput);
      setPasswordInput('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : t('stationEditorLoginFailed'));
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminPassword(null);
    setContent(null);
    setDrafts({});
  };

  // ─── Daten ────────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (!adminPassword) return;
    try {
      setContent(await apiAdminGetContent(adminPassword));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error && err.message ? err.message : t('adminLoadFailed'));
    }
  }, [adminPassword, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Nach jeder Änderung: Verwaltung und öffentliche App-Daten neu laden */
  const refreshAll = useCallback(async () => {
    await Promise.all([reload(), onDataChanged()]);
  }, [reload, onDataChanged]);

  const paths = content?.paths ?? [];
  const stationsByPath = useMemo(() => {
    const map = new Map<string, CustomStation[]>();
    for (const station of content?.stations ?? []) {
      const list = map.get(station.path_id) ?? [];
      list.push(station);
      map.set(station.path_id, list);
    }
    map.forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
    return map;
  }, [content]);
  const orphanStations = useMemo(
    () => (content?.stations ?? []).filter((s) => !paths.some((p) => p.id === s.path_id)),
    [content, paths]
  );
  const draftStationIds = useMemo(
    () => new Set(Object.keys(drafts).filter((k) => k.startsWith('s:')).map((k) => Number(k.slice(2)))),
    [drafts]
  );

  // ─── Medien für Editoren (Objekt-URLs leben so lange wie die Verwaltung, wegen gemerkter Entwürfe) ──
  const prepareMedia = useCallback(async (file: File, kind: MediaKind): Promise<ImageItem | null> => {
    if (kind === 'audio') {
      if (!/\.(mp3|m4a)$/i.test(file.name) && !/^audio\/(mpeg|mp3|mp4|x-m4a|m4a|aac)$/.test(file.type)) {
        toast.error(t('adminAudioFormat'));
        return null;
      }
      if (file.size > MAX_AUDIO_BYTES) {
        toast.error(t('adminAudioTooLarge'));
        return null;
      }
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      return { kind: 'new', file, url };
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error(t('stationEditorImageFormat'));
      return null;
    }
    const prepared = await prepareImage(file, kind === 'panorama' ? MAX_PANORAMA_EDGE : undefined);
    const url = URL.createObjectURL(prepared);
    objectUrlsRef.current.push(url);
    return { kind: 'new', file: prepared, url };
  }, [t]);

  // ─── Reihenfolge, Sichtbarkeit ────────────────────────────────────────────
  const reorder = async (kind: 'paths' | 'stations', ids: (string | number)[], applyLocal: (c: NonNullable<typeof content>) => NonNullable<typeof content>) => {
    if (!adminPassword || !content) return;
    setContent(applyLocal(content));
    try {
      await apiAdminReorder(adminPassword, kind, ids);
      await onDataChanged();
    } catch (err) {
      toast.error(t('adminReorderFailed'), { description: err instanceof Error ? err.message : undefined });
      await reload();
    }
  };

  const movePath = (index: number, direction: -1 | 1) => {
    const ids = paths.map((p) => p.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void reorder('paths', ids, (c) => ({
      ...c,
      paths: ids.map((id, i) => ({ ...c.paths.find((p) => p.id === id)!, sort_order: i })),
    }));
  };

  const moveStation = (pathId: string, index: number, direction: -1 | 1) => {
    const list = [...(stationsByPath.get(pathId) ?? [])];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const order = new Map(list.map((s, i) => [s.id, i]));
    void reorder('stations', list.map((s) => s.id), (c) => ({
      ...c,
      stations: c.stations.map((s) => (order.has(s.id) ? { ...s, sort_order: order.get(s.id)! } : s)),
    }));
  };

  const togglePathPublished = async (path: CustomPath) => {
    if (!adminPassword) return;
    try {
      await apiAdminSetPublished(adminPassword, 'path', path.id, !path.published);
      await refreshAll();
      toast.success(path.published ? t('adminPathNowDraft') : t('adminPathNowPublished'), { description: path.title_de });
    } catch (err) {
      toast.error(t('adminPublishFailed'), { description: err instanceof Error ? err.message : undefined });
    }
  };

  const deletePath = async (path: CustomPath) => {
    if (!adminPassword) return;
    try {
      await apiAdminDeletePath(adminPassword, path.id);
      await refreshAll();
      toast.success(t('pathEditorDeleted'), { description: path.title_de });
      go({ kind: 'overview' }, true);
    } catch (err) {
      toast.error(t('pathEditorDeleteFailed'), { description: err instanceof Error ? err.message : undefined });
    }
  };

  const setDraft = useCallback((key: string, draft: StationDraft | null) => {
    setDrafts((prev) => {
      if (draft === null) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: draft };
    });
  }, []);

  const openStation = (station: CustomStation) => go({ kind: 'station', pathId: station.path_id, stationId: station.id });

  // ─── Admin-Login ──────────────────────────────────────────────────────────
  if (!adminPassword) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 pt-5 pb-12">
          <BackLink onBack={onBack} />
          <PageIntro className="mt-5 mb-6" title={t('stationEditorTitle')} description={t('stationEditorLoginIntro')} icon={<LockKeyhole className="w-6 h-6" />} />
          <form onSubmit={handleLogin} className="surface-card p-5 space-y-5" noValidate>
            <div>
              <FieldLabel htmlFor="admin-password">{t('stationEditorAdminPassword')}</FieldLabel>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="admin-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={`h-14 pl-12 pr-4 rounded-2xl ${loginError ? 'border-destructive' : ''}`}
                  autoComplete="current-password"
                  aria-invalid={!!loginError}
                  disabled={loggingIn}
                />
              </div>
              <FieldError message={loginError ?? undefined} />
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold shadow-primary disabled:shadow-none" disabled={loggingIn || !passwordInput}>
              {loggingIn ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('stationEditorUnlock')}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Aktuelle Seite ───────────────────────────────────────────────────────
  const routePathId = route.kind === 'overview' || route.kind === 'newPath' ? null : route.pathId;
  const currentPath = routePathId ? paths.find((p) => p.id === routePathId) ?? null : null;
  const pathTitle = currentPath?.title_de ?? (routePathId === 'tourist' ? arPath.title : t('adminOrphanStations'));
  const currentStation = route.kind === 'station' ? content?.stations.find((s) => s.id === route.stationId) ?? null : null;

  const crumbs: Crumb[] = [
    { label: t('settings'), onClick: onBack, icon: <SettingsIcon className="w-4 h-4 flex-shrink-0" /> },
    { label: t('stationEditorTitle'), onClick: route.kind === 'overview' ? undefined : () => go({ kind: 'overview' }) },
  ];
  if (route.kind === 'newPath') crumbs.push({ label: t('pathEditorNewTitle') });
  if (routePathId) crumbs.push({ label: pathTitle, onClick: route.kind === 'path' ? undefined : () => go({ kind: 'path', pathId: routePathId }) });
  if (route.kind === 'editPath') crumbs.push({ label: t('adminEditPath') });
  if (route.kind === 'pickTemplate') crumbs.push({ label: t('adminNewStation') });
  if (route.kind === 'newStation') {
    crumbs.push({ label: t('adminNewStation'), onClick: () => go({ kind: 'pickTemplate', pathId: route.pathId }) });
    const template = STATION_TEMPLATES.find((tpl) => tpl.id === route.templateId);
    crumbs.push({ label: template ? t(template.labelKey) : t('templateBlank') });
  }
  if (route.kind === 'station') crumbs.push({ label: currentStation?.title_de ?? '…' });

  let page: React.ReactNode;
  if (!content) {
    page = loadError ? (
      <div className="mt-6 surface-card p-6 text-center">
        <p className="font-bold">{t('adminLoadFailed')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
        <button type="button" onClick={() => void reload()} className="mt-4 min-h-[48px] px-5 rounded-2xl bg-primary text-white font-bold inline-flex items-center gap-2 pressable">
          <RotateCw className="w-4 h-4" />
          {t('adminRetry')}
        </button>
      </div>
    ) : (
      <div className="mt-4 space-y-3" role="status" aria-label={t('adminLoading')}>
        <div className="h-24 rounded-[20px] bg-muted animate-pulse" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="h-56 rounded-[20px] bg-muted animate-pulse" />
          <div className="h-56 rounded-[20px] bg-muted animate-pulse" />
        </div>
      </div>
    );
  } else if (route.kind === 'overview') {
    page = (
      <AdminOverview
        paths={paths}
        stationsByPath={stationsByPath}
        orphanStations={orphanStations}
        arPath={arPath}
        onOpenPath={(pathId) => go({ kind: 'path', pathId })}
        onNewPath={() => go({ kind: 'newPath' })}
        onOpenStation={openStation}
        onMovePath={movePath}
      />
    );
  } else if (route.kind === 'newPath' || route.kind === 'editPath') {
    const editing = route.kind === 'editPath' ? currentPath : null;
    page = route.kind === 'editPath' && !editing ? <NotFound onBack={() => go({ kind: 'overview' })} /> : (
      <PathAdminForm
        key={editing?.id ?? 'new'}
        path={editing}
        adminPassword={adminPassword}
        onSaved={async (saved) => {
          await refreshAll();
          go({ kind: 'path', pathId: saved.id }, true);
        }}
        onCancel={() => (editing ? go({ kind: 'path', pathId: editing.id }) : go({ kind: 'overview' }))}
      />
    );
  } else if (route.kind === 'path') {
    page = currentPath || (stationsByPath.get(route.pathId)?.length ?? 0) > 0 ? (
      <PathStationsView
        path={currentPath}
        title={pathTitle}
        stations={stationsByPath.get(route.pathId) ?? []}
        draftStationIds={draftStationIds}
        onOpenStation={openStation}
        onNewStation={() => go({ kind: 'pickTemplate', pathId: route.pathId })}
        onEditPath={() => go({ kind: 'editPath', pathId: route.pathId })}
        onTogglePublished={() => (currentPath ? togglePathPublished(currentPath) : Promise.resolve())}
        onDeletePath={() => (currentPath ? deletePath(currentPath) : Promise.resolve())}
        onMoveStation={(index, direction) => moveStation(route.pathId, index, direction)}
      />
    ) : <NotFound onBack={() => go({ kind: 'overview' })} />;
  } else if (route.kind === 'pickTemplate') {
    page = currentPath ? (
      <StationTemplatePicker pathTitle={currentPath.title_de} onPick={(templateId) => go({ kind: 'newStation', pathId: route.pathId, templateId })} />
    ) : <NotFound onBack={() => go({ kind: 'overview' })} />;
  } else if (route.kind === 'newStation') {
    const key = `new:${route.pathId}:${route.templateId}`;
    if (!newPristineRef.current[key]) {
      const template = STATION_TEMPLATES.find((tpl) => tpl.id === route.templateId);
      newPristineRef.current[key] = emptyStationDraft(route.pathId, template ? modulesFromTemplate(template) : [], pointConfig?.settings.default_station_points);
    }
    page = currentPath ? (
      <StationEditor
        key={key}
        adminPassword={adminPassword}
        station={null}
        pristine={newPristineRef.current[key]}
        savedDraft={drafts[key] ?? null}
        onDraftChange={(d) => setDraft(key, d)}
        paths={paths}
        allStations={content.stations}
        prepareMedia={prepareMedia}
        onSaved={async (saved) => {
          delete newPristineRef.current[key];
          await refreshAll();
          go({ kind: 'station', pathId: saved.path_id, stationId: saved.id }, true);
        }}
        onDeleted={async () => undefined}
        onOpenStation={openStation}
        arChrome={arChrome}
      />
    ) : <NotFound onBack={() => go({ kind: 'overview' })} />;
  } else {
    const key = `s:${route.stationId}`;
    page = currentStation ? (
      <StationEditor
        key={`${key}:${currentStation.updated_at}`}
        adminPassword={adminPassword}
        station={currentStation}
        pristine={draftFromStation(currentStation)}
        savedDraft={drafts[key] ?? null}
        onDraftChange={(d) => setDraft(key, d)}
        paths={paths}
        allStations={content.stations}
        prepareMedia={prepareMedia}
        onSaved={async (saved) => {
          await refreshAll();
          if (saved.path_id !== route.pathId) go({ kind: 'station', pathId: saved.path_id, stationId: saved.id }, true);
        }}
        onDeleted={async (deleted) => {
          await refreshAll();
          go({ kind: 'path', pathId: deleted.path_id }, true);
        }}
        onOpenStation={openStation}
        arChrome={arChrome}
      />
    ) : <NotFound onBack={() => go({ kind: 'path', pathId: route.pathId })} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 pt-3 pb-12">
        <div className="flex items-center justify-between gap-2 mb-3 -ml-2">
          <Breadcrumbs items={crumbs} />
          <button
            type="button"
            onClick={handleLogout}
            className="flex-shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </button>
        </div>
        <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8 lg:items-start">
          <aside className="hidden lg:block">
            {content && (
              <AdminSidebar
                paths={paths}
                stationsByPath={stationsByPath}
                arPath={arPath}
                activePathId={routePathId}
                activeStationId={route.kind === 'station' ? route.stationId : null}
                onOverview={() => go({ kind: 'overview' })}
                onOpenPath={(pathId) => go({ kind: 'path', pathId })}
                onOpenStation={openStation}
                onNewPath={() => go({ kind: 'newPath' })}
                draftStationIds={draftStationIds}
              />
            )}
          </aside>
          <main className="min-w-0 max-w-4xl">{page}</main>
        </div>
      </div>
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="mt-6 rounded-[20px] border-2 border-dashed border-border-strong p-8 text-center">
      <p className="font-bold">{t('adminNotFound')}</p>
      <button type="button" onClick={onBack} className="mt-4 min-h-[44px] px-4 rounded-xl bg-muted font-semibold hover:bg-secondary transition-colors">
        {t('back')}
      </button>
    </div>
  );
}
