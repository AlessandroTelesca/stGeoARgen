import { Component, useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { Home, Orbit, Pencil, Play, Smartphone, Trophy } from 'lucide-react';
import { LanguageOverride, useLanguage } from '../../contexts/LanguageContext';
import { MODULE_META } from '../../stationModules/meta';
import { MODULE_PLAYERS } from '../../stationModules/player/players';
import type { ModulePlayerProps } from '../../stationModules/player/ui';
import { pickLang, type StationModule } from '../../stationModules/types';

/**
 * Live-Vorschau des Stationseditors: zeigt die Station so, wie sie auf dem Handy erscheint –
 * erst die Stationsseite, dann jedes Modul mit den echten Playern, bei jeder Eingabe aktualisiert
 * und komplett in der Sprache der gerade bearbeiteten Texte. Antippen springt zum passenden Feld.
 */

/** -1 = Stationsseite, 0… = Modul */
export const STATION_PAGE = -1;

interface PhonePreviewProps {
  station: { title: string; description: string; longDescription: string; coverUrl: string | null; points: number };
  /** Module mit Vorschau-URLs (fehlende Pflichtmedien als leere URL) */
  modules: StationModule<string>[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Zum Feld bzw. Modul im Editor springen */
  onEdit: (index: number) => void;
  /** Ganze Station im Vollbild abspielen */
  onPlay?: () => void;
  lang: 'de' | 'en';
  className?: string;
  /** Höhe, die neben dem Handy für anderes gebraucht wird (Seitenleiste: Kopf, Aktionsleiste; Fenster: weniger) */
  reservedHeight?: number;
}

/** Fängt Fehler halb ausgefüllter Module ab, statt die Seite abstürzen zu lassen */
class PreviewBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Sind Listen leer, die ein Player zum Anzeigen braucht? */
function isEmptyModule(module: StationModule<string>): boolean {
  switch (module.type) {
    case 'slideshow': return module.slides.length === 0;
    case 'quiz': return module.questions.length === 0;
    case 'timeline': return module.entries.length === 0;
    case 'audio': return module.audio === '';
    case 'hotspots': return module.image === '';
    case 'before_after': return module.before_image === '';
    default: return false;
  }
}

function PreviewNote({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center text-white/75">
      <span className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">{icon}</span>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}

/** Stationsseite wie in der App (StationDetail): Titelbild, Titel, Punkte, Beschreibung, Start */
function StationPagePreview({ station, onEdit }: { station: PhonePreviewProps['station']; onEdit: () => void }) {
  const { t } = useLanguage();
  return (
    <button type="button" onClick={onEdit} className="flex flex-col justify-start w-full h-full text-left bg-background text-foreground overflow-y-auto" aria-label={t('adminPreviewEditStationPage')}>
      <div className="relative flex-shrink-0 h-[42%] bg-muted">
        {station.coverUrl ? (
          <img src={station.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 brand-gradient"><div className="topo-texture absolute inset-0" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/0 to-black/70" />
        <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/20 px-3.5 py-2 text-white text-sm font-bold tabular-nums">
          <Trophy className="w-4 h-4 text-gold-bright" />
          {station.points} {t('points')}
        </span>
        <p className={`absolute inset-x-0 bottom-0 px-5 pb-10 text-[30px] leading-[1.1] font-extrabold tracking-tight text-white drop-shadow-sm ${station.title ? '' : 'opacity-60'}`}>
          {station.title || t('stationEditorNamePlaceholder')}
        </p>
      </div>
      <div className="relative -mt-6 rounded-t-[28px] bg-background px-5 pt-6 pb-8 space-y-5">
        <p className={`text-[15px] leading-relaxed text-gray-700 whitespace-pre-line line-clamp-[9] ${station.longDescription ? '' : 'italic text-muted-foreground'}`}>
          {station.longDescription || t('stationEditorLongDescriptionPlaceholder')}
        </p>
        <div className="brand-gradient rounded-[24px] p-6 text-white text-center shadow-lg">
          <p className="font-bold text-xl">{t('stationPlayerReady')}</p>
          <span className="mt-5 w-full min-h-[56px] rounded-2xl bg-white text-primary font-extrabold flex items-center justify-center gap-2 shadow-lg">
            <Play className="w-5 h-5" fill="currentColor" />
            {t('stationPlayerStart')}
          </span>
        </div>
      </div>
    </button>
  );
}

function PhoneScreen({ station, modules, activeIndex, onSelect, onEdit, lang }: PhonePreviewProps) {
  const { t } = useLanguage();
  const module = activeIndex >= 0 ? modules[activeIndex] : undefined;
  const isLast = activeIndex === modules.length - 1;

  if (activeIndex === STATION_PAGE) {
    return <StationPagePreview station={station} onEdit={() => onEdit(STATION_PAGE)} />;
  }

  let content: ReactNode;
  if (!module) {
    content = <PreviewNote icon={<Smartphone className="w-6 h-6" />} text={t('adminPreviewEmpty')} />;
  } else if (module.type === 'ar_panorama') {
    content = <PreviewNote icon={<Orbit className="w-6 h-6" />} text={t('adminPreviewArPanorama')} />;
  } else if (isEmptyModule(module)) {
    content = <PreviewNote icon={<Smartphone className="w-6 h-6" />} text={t('adminPreviewIncomplete')} />;
  } else {
    const Player = MODULE_PLAYERS[module.type] as unknown as ComponentType<ModulePlayerProps<typeof module.type>>;
    content = (
      <PreviewBoundary key={`${module.id}-${JSON.stringify(module).length}`} fallback={<PreviewNote icon={<Smartphone className="w-6 h-6" />} text={t('adminPreviewIncomplete')} />}>
        <Player
          key={module.id}
          module={module as never}
          lang={lang}
          preview
          continueLabel={isLast ? t('stationPlayerFinish') : t('stationImageSequenceNext')}
          onContinue={() => onSelect(isLast ? STATION_PAGE : activeIndex + 1)}
          stationTitle={station.title}
        />
      </PreviewBoundary>
    );
  }

  return (
    <div className="h-full bg-black text-white flex flex-col" style={{ '--module-footer-pad': '18px' } as CSSProperties}>
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex gap-1" aria-hidden="true">
          {modules.map((m, i) => (
            <span key={m.id} className={`h-1 flex-1 rounded-full transition-colors ${i <= activeIndex ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
        <p className="mt-2.5 text-sm font-bold truncate">{station.title || t('adminNewStation')}</p>
        {module && (
          <p className="text-sm text-white/80 tabular-nums truncate">
            {t('stationPlayerPart', { current: activeIndex + 1, total: modules.length })}
          </p>
        )}
      </div>
      <div className="flex-1 min-h-0">{content}</div>
    </div>
  );
}

/** Logische Bildschirmgröße eines typischen Handys – die Vorschau rendert in echter Größe und skaliert */
const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;

/** Bildschirm in echten Handy-Pixeln, per transform auf die Rahmenbreite skaliert (maßstabsgetreu) */
function ScaledScreen({ children }: { children: ReactNode }) {
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
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

export function PhonePreview(props: PhonePreviewProps) {
  const { t } = useLanguage();
  const { modules, activeIndex, onSelect, onEdit, onPlay, lang, className = '', reservedHeight = 390 } = props;

  return (
    <figure className={`m-0 ${className}`}>
      {/* Handy-Rahmen – Inhalt in der Sprache der bearbeiteten Texte */}
      <div
        className="relative mx-auto w-full rounded-[44px] bg-gray-900 p-2.5 shadow-2xl"
        // Nie höher als der Bildschirm (Platz für Kopf und Modulleiste): Breite aus der Höhe ableiten
        style={{ maxWidth: `min(300px, calc((100dvh - ${reservedHeight}px) * 0.47))`, minWidth: '220px' }}
      >
        <ScaledScreen>
          <LanguageOverride language={lang}>
            <PhoneScreen {...props} />
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
              aria-current={activeIndex === STATION_PAGE ? 'step' : undefined}
              title={t('adminPreviewStationPage')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${activeIndex === STATION_PAGE ? 'bg-primary text-white shadow-primary' : 'bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40'}`}
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
          {activeIndex === STATION_PAGE ? t('adminPreviewEditStationPage') : t('adminPreviewEditModule')}
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
