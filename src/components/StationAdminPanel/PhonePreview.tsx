import { Component, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Home, Hand, Pencil, Play, Smartphone } from 'lucide-react';
import { LanguageOverride, useLanguage } from '../../contexts/LanguageContext';
import { MODULE_META } from '../../stationModules/meta';
import { StationModulePlayer } from '../../stationModules/player/StationModulePlayer';
import type { StationModulePlayerProps } from '../../stationModules/player/contract';
import type { StationCoordinates } from '../../data/stationsConfig';
import type { StationModule } from '../../stationModules/types';
import { stableHash } from '../../lib/stableHash';
import { StationDetail } from '../StationDetail';

/**
 * Live-Vorschau des Stationseditors: zeigt die ECHTEN App-Komponenten (Stationsseite und Modul-Player)
 * in einem Handyrahmen, bei jeder Eingabe aktualisiert und komplett in der Sprache der gerade
 * bearbeiteten Texte. „Ausprobieren“ lässt alles bedienen, „Bearbeiten“ springt per Klick zum passenden Feld.
 */

/** -1 = Stationsseite, 0… = Modul */
export const STATION_PAGE = -1;

type PreviewMode = 'try' | 'edit';
type VisitorState = 'in_range' | 'too_far' | 'needs_login' | 'completed';

const VISITOR_STATES: VisitorState[] = ['in_range', 'too_far', 'needs_login', 'completed'];
const MODE_STORAGE_KEY = 'stationPreviewMode';

interface PhonePreviewProps {
  station: {
    title: string;
    description: string;
    longDescription: string;
    coverUrl: string | null;
    points: number;
    /** Akzentfarbe (#rrggbb); null = Standard */
    color: string | null;
    latitude: number | null;
    longitude: number | null;
    /** Station enthält das Modul „AR-Rundumblick“ */
    hasArModule: boolean;
  };
  /** Module mit Vorschau-URLs (fehlende Pflichtmedien als leere URL) */
  modules: StationModule<string>[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Zum Feld bzw. Modul im Editor springen */
  onEdit: (index: number) => void;
  /** Ganze Station im Vollbild abspielen */
  onPlay?: () => void;
  lang: 'de' | 'en';
  /** Demo-Werte für die AR-Oberfläche (Top-Bar, Fortschritt) */
  chrome: StationModulePlayerProps['arChrome'];
  /** Nächste Stationen im Pfad (für den Abschlussdialog) */
  nextStations?: StationCoordinates[];
  className?: string;
  /** Höhe, die neben dem Handy für anderes gebraucht wird (Seitenleiste: Kopf, Aktionsleiste; Fenster: weniger) */
  reservedHeight?: number;
}

/** Fängt Fehler halb ausgefüllter Inhalte ab; ein neuer `resetKey` (Inhalt geändert) setzt den Fehlerzustand zurück */
class PreviewBoundary extends Component<{ resetKey: string; fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function PreviewNote({ text }: { text: string }) {
  return (
    <div className="h-full bg-background text-foreground flex flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center"><Smartphone className="w-6 h-6" /></span>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function readStoredMode(): PreviewMode {
  try {
    return localStorage.getItem(MODE_STORAGE_KEY) === 'edit' ? 'edit' : 'try';
  } catch {
    return 'try';
  }
}

/** Logische Bildschirmgröße eines typischen Handys – die Vorschau rendert in echter Größe und skaliert */
const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;

/**
 * Bildschirm in echten Handy-Pixeln, per transform auf die Rahmenbreite skaliert (maßstabsgetreu).
 * Der transform-Vorfahr macht auch position:fixed-Kinder (Vollbild-Komponenten) relativ zum Bildschirm.
 */
function ScaledScreen({ children, overlay, screenRef }: { children: ReactNode; overlay?: ReactNode; screenRef: (el: HTMLDivElement | null) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setScale(box.clientWidth / SCREEN_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={boxRef} className="relative rounded-[34px] overflow-hidden isolate" style={{ aspectRatio: `${SCREEN_WIDTH} / ${SCREEN_HEIGHT}` }}>
      <div
        ref={screenRef}
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          transform: `scale(${scale})`,
          // Wie auf dem echten Handy: 1dvh der Bildschirmhöhe und Abstand der Modul-Buttons über der Leiste
          '--app-dvh': `${SCREEN_HEIGHT / 100}px`,
          '--module-footer-pad': '18px',
        } as CSSProperties}
      >
        {children}
      </div>
      {overlay}
    </div>
  );
}

/** Umschalter Ausprobieren / Bearbeiten über dem Handy */
function ModeSwitch({ value, onChange }: { value: PreviewMode; onChange: (mode: PreviewMode) => void }) {
  const { t } = useLanguage();
  const options: { id: PreviewMode; label: string; icon: ReactNode }[] = [
    { id: 'try', label: t('stationPreviewModeTry'), icon: <Hand className="w-4 h-4" /> },
    { id: 'edit', label: t('stationPreviewModeEdit'), icon: <Pencil className="w-4 h-4" /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1" role="radiogroup" aria-label={t('stationPreviewModeLabel')}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={`h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${value === option.id ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PhonePreview(props: PhonePreviewProps) {
  const { t } = useLanguage();
  const { station, modules, activeIndex, onSelect, onEdit, onPlay, lang, chrome, nextStations, className = '', reservedHeight = 450 } = props;
  const [mode, setMode] = useState<PreviewMode>(readStoredMode);
  const [visitorState, setVisitorState] = useState<VisitorState>('in_range');
  const [screenEl, setScreenEl] = useState<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const editing = mode === 'edit';
  const onStationPage = activeIndex === STATION_PAGE;

  const changeMode = (next: PreviewMode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Speicher nicht verfügbar: Modus gilt nur für diese Sitzung
    }
  };

  // Im Bearbeiten-Modus ist der Bildschirminhalt nicht bedienbar (React 18 kennt `inert` nicht als Attribut)
  useEffect(() => {
    contentRef.current?.toggleAttribute('inert', editing);
  }, [editing]);

  // Ändert sich Station oder Inhalt, bekommt eine zuvor abgestürzte Vorschau eine neue Chance
  const resetKey = useMemo(() => stableHash(JSON.stringify({ station, modules })), [station, modules]);

  const incomplete = <PreviewNote text={t('adminPreviewIncomplete')} />;
  const title = station.title || t('adminNewStation');

  return (
    <figure className={`m-0 ${className}`}>
      <div className="mx-auto mb-3 max-w-[300px]">
        <ModeSwitch value={mode} onChange={changeMode} />
      </div>

      {/* Besucherzustand – nur auf der Stationsseite relevant (Standort, Anmeldung, erledigt) */}
      {onStationPage && (
        <div role="group" aria-labelledby="phone-preview-visitor" className="mx-auto mb-3 max-w-[300px] flex flex-wrap items-center justify-center gap-1.5">
          <p id="phone-preview-visitor" className="w-full text-center text-xs font-semibold text-muted-foreground">{t('stationPreviewVisitorState')}</p>
          {VISITOR_STATES.map((state) => (
            <button
              key={state}
              type="button"
              aria-pressed={visitorState === state}
              onClick={() => setVisitorState(state)}
              className={`min-h-[32px] px-3 rounded-full text-xs font-bold transition-colors ${visitorState === state ? 'bg-primary text-white' : 'bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40'}`}
            >
              {t(`stationPreviewVisitor_${state}`)}
            </button>
          ))}
        </div>
      )}

      {/* Handy-Rahmen – Inhalt in der Sprache der bearbeiteten Texte */}
      <div
        className="relative mx-auto w-full rounded-[44px] bg-gray-900 p-2.5 shadow-2xl"
        // Nie höher als der Bildschirm (Platz für Kopf, Umschalter und Modulleiste): Breite aus der Höhe ableiten
        style={{ maxWidth: `min(300px, calc((100dvh - ${reservedHeight}px) * 0.47))`, minWidth: '220px' }}
      >
        <ScaledScreen
          screenRef={setScreenEl}
          overlay={editing && (
            <button
              type="button"
              onClick={() => onEdit(activeIndex)}
              aria-label={t('stationPreviewEditHere')}
              className="absolute inset-0 z-10 rounded-[34px] cursor-pointer focus-visible:outline-none hover:ring-2 focus-visible:ring-2 ring-primary/60 ring-inset"
            >
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-card/95 px-3 py-1.5 text-xs font-bold text-primary shadow-md">
                <Pencil className="w-3.5 h-3.5" />
                {t('stationPreviewClickToEdit')}
              </span>
            </button>
          )}
        >
          <LanguageOverride language={lang}>
            <div ref={contentRef} className="h-full">
              <PreviewBoundary resetKey={resetKey} fallback={incomplete}>
                {onStationPage ? (
                  <StationDetail
                    preview={{ state: visitorState, onStart: () => onSelect(0) }}
                    station={{
                      id: 0,
                      title,
                      description: station.description,
                      longDescription: station.longDescription,
                      imageUrl: station.coverUrl ?? '',
                      points: station.points,
                      status: visitorState === 'completed' ? 'completed' : 'available',
                      latitude: station.latitude ?? 0,
                      longitude: station.longitude ?? 0,
                      // Kennzeichnet eine Station aus der Stationsverwaltung (Texte der Modul-Bühne)
                      arRoute: 'preview',
                      hasArModule: station.hasArModule,
                      color: station.color,
                    }}
                    onClose={() => {}}
                    onComplete={() => {}}
                    isLoggedIn={visitorState !== 'needs_login'}
                  />
                ) : (
                  <StationModulePlayer
                    embedded
                    preview
                    station={{
                      id: 0,
                      title,
                      latitude: station.latitude ?? 0,
                      longitude: station.longitude ?? 0,
                      points: station.points,
                      color: station.color,
                      modules,
                    }}
                    lang={lang}
                    activeIndex={activeIndex}
                    onIndexChange={onSelect}
                    onClose={() => onSelect(STATION_PAGE)}
                    arChrome={chrome}
                    portalContainer={screenEl}
                    nextStations={nextStations}
                    canComplete={false}
                    isGuest={false}
                  />
                )}
              </PreviewBoundary>
            </div>
          </LanguageOverride>
        </ScaledScreen>
      </div>

      {/* Ablauf als Leiste: Stationsseite + Module – antippen zeigt sie im Handy */}
      <nav aria-label={t('adminPreviewSteps')} className="mt-4">
        <ol className="flex flex-wrap justify-center gap-1.5">
          <li>
            <button
              type="button"
              onClick={() => onSelect(STATION_PAGE)}
              aria-current={onStationPage ? 'step' : undefined}
              title={t('adminPreviewStationPage')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${onStationPage ? 'bg-primary text-white shadow-primary' : 'bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40'}`}
            >
              <Home className="w-4 h-4" />
              <span className="sr-only">{t('adminPreviewStationPage')}</span>
            </button>
          </li>
          {modules.map((m, i) => {
            const Icon = MODULE_META[m.type].icon;
            const active = i === activeIndex;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-current={active ? 'step' : undefined}
                  title={`${i + 1}. ${t(MODULE_META[m.type].labelKey)}`}
                  className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-primary text-white shadow-primary' : 'bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span aria-hidden="true" className={`absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full text-[11px] font-bold tabular-nums flex items-center justify-center ${active ? 'bg-gold text-gold-foreground' : 'bg-foreground text-white'}`}>{i + 1}</span>
                  <span className="sr-only">{`${i + 1}. ${t(MODULE_META[m.type].labelKey)}`}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(activeIndex)}
          className="min-h-[44px] px-4 rounded-full bg-card border border-border text-sm font-bold text-primary flex items-center gap-2 hover:border-primary/40 transition-colors pressable"
        >
          <Pencil className="w-4 h-4" />
          {onStationPage ? t('adminPreviewEditStationPage') : t('adminPreviewEditModule')}
        </button>
        {onPlay && modules.length > 0 && (
          <button
            type="button"
            onClick={onPlay}
            className="min-h-[44px] px-4 rounded-full bg-card border border-border text-sm font-bold text-primary flex items-center gap-2 hover:border-primary/40 transition-colors pressable"
          >
            <Play className="w-4 h-4" fill="currentColor" />
            {t('adminPreviewPlayAll')}
          </button>
        )}
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">
        {lang === 'en' ? t('adminPreviewCaptionEn') : t('adminPreviewCaption')}
      </figcaption>
    </figure>
  );
}
