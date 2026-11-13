import { Component, useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, Layers, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { ARTopBar } from '../../components/ARComponents/ARTopBar';
import { ARProgressBar, buildARProgress } from '../../components/ARComponents/ARProgressBar';
import { ARProfileMenu } from '../../components/ARComponents/ARProfileMenu';
import { ARStationCompletionDialog } from '../../components/ARComponents/ARStationCompletionDialog';
import { calculateDistance } from '../../components/ARComponents/ARComponentBase';
import type { StationCoordinates } from '../../data/stationsConfig';
import '../../components/ARComponents/ARComponents.css';
import type { StationModule } from '../types';
import type { StationModulePlayerProps } from './contract';
import { AR_STAGES } from './arStages';
import { MODULE_PLAYERS } from './players';
import { isModulePassed, PrimaryButton, type ModuleResult } from './ui';
import { ModuleGate, ModuleNote } from './ModuleGate';
import { moduleMissingContent, moduleStructureKey } from './previewSupport';
import { MODULE_META } from '../meta';
import { useDialogFocus } from '../../lib/useDialogFocus';
import { isAndroidDevice, isArCapableDevice, isIOSDevice } from '../../lib/device';
import { stationThemeProps } from '../../lib/stationTheme';

const ease = [0.16, 1, 0.3, 1] as const;

/** Abstand der Modul-Buttons zum unteren Rand: über der AR-Fortschrittsleiste (kompakt/normal) bzw. nur Safe-Area */
const FOOTER_PAD_SAFE = 'max(24px, env(safe-area-inset-bottom, 0px))';
const FOOTER_PAD_COMPACT = `calc(62px + ${FOOTER_PAD_SAFE})`;
const FOOTER_PAD_NORMAL = `calc(112px + ${FOOTER_PAD_SAFE})`;

/** Spieler eines Moduls; die Zuordnung Typ → Spieler kommt aus players.ts */
type AnyModulePlayer = ComponentType<{
  module: StationModule<string>;
  lang: 'de' | 'en';
  preview: boolean;
  continueLabel: string;
  onContinue: () => void;
  onResult?: (result: ModuleResult) => void;
  stationTitle?: string;
}>;

/** Fängt Fehler eines Moduls ab (echter Betrieb wie Vorschau); ein neuer `resetKey` setzt den Fehlerzustand zurück */
class ModuleBoundary extends Component<{ resetKey: string; fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
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

/** Offene Bestehensgrenze: Ergebnis des Moduls, das nicht reichte */
interface GateState {
  moduleId: string;
  correct: number;
  total: number;
  threshold: number;
}

const stageButtonClass =
  'w-11 h-11 rounded-full bg-white/12 border border-white/20 flex items-center justify-center flex-shrink-0 hover:bg-white/20 transition-colors pressable';

/**
 * Bühne einer Station aus der Stationsverwaltung: spielt die Module der Reihe nach ab
 * (Erzähltext, Bildfolge, Quiz, …), danach wird die Station abgeschlossen. Gleiche dunkle
 * Vollbild-Oberfläche und AR-Chrome wie die AR-Stationen. Läuft auch als Vorschau im Admin-Bereich.
 */
export function StationModulePlayer({
  station,
  lang,
  arChrome,
  preview = false,
  canComplete,
  isGuest,
  onCompleteStation,
  onClose,
  embedded = false,
  activeIndex,
  onIndexChange,
  portalContainer,
  nextStations,
}: StationModulePlayerProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const modules = station.modules;
  // Gesteuerter Modus (Admin-Vorschau): activeIndex von außen, sonst interner Zustand
  const [internalIndex, setInternalIndex] = useState(0);
  const index = activeIndex ?? internalIndex;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isProgressCompact, setIsProgressCompact] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const upcoming = nextStations ?? [];
  const showChrome = !preview || embedded;
  const theme = stationThemeProps(station.color);
  const { progress, stations } = buildARProgress(arChrome.completedStations, arChrome.totalStations, arChrome.totalPoints);

  const startedAtRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const [completion, setCompletion] = useState<{
    durationSeconds: number;
    remainingStations: number;
    nextStation: StationCoordinates | null;
    distanceToNext: number | null;
  } | null>(null);

  // Bestehensgrenze: Ergebnisse je Modul, offene Karte, Wiederholungen, aufgegebene Station
  const resultsRef = useRef<Record<string, ModuleResult>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [gate, setGate] = useState<GateState | null>(null);
  const [ended, setEnded] = useState(false);
  const forfeitedRef = useRef(false);
  const failedIdsRef = useRef<string[]>([]);

  // Tab bleibt im Player (Escape regelt der Tastatur-Effekt unten); aus, solange ein Dialog oder eine Karte offen ist
  // (eingebettet im Admin-Rahmen gibt es keinen Fokusfang)
  useDialogFocus(dialogRef, !embedded && completion === null && gate === null && !ended);

  const safeIndex = Math.max(0, Math.min(index, Math.max(modules.length - 1, 0)));
  const current = modules[safeIndex];
  const isLast = safeIndex === modules.length - 1;
  const stage = current ? AR_STAGES[current.type] : undefined;
  // Auf dem Handy bringt der AR-Rundumblick seine eigene AR-Oberfläche mit und braucht den ganzen Bildschirm
  const isNativeAr = !!stage?.Native && !preview && isArCapableDevice();

  // Richtung aus dem Vergleich mit dem vorherigen Index, damit sie auch bei extern geändertem activeIndex stimmt
  const prevIndexRef = useRef(safeIndex);
  const directionRef = useRef<1 | -1>(1);
  if (prevIndexRef.current !== safeIndex) {
    directionRef.current = safeIndex > prevIndexRef.current ? 1 : -1;
    prevIndexRef.current = safeIndex;
  }
  const direction = directionRef.current;

  // Modulwechsel (auch von außen): offene Karten und der Demo-Abschluss der eingebetteten Vorschau gehören nicht mehr dazu
  useEffect(() => {
    setGate(null);
    setEnded(false);
    if (preview && embedded) setCompletion(null);
  }, [safeIndex, preview, embedded]);

  const goTo = (next: number) => {
    if (next < 0 || next >= modules.length) return;
    setInternalIndex(next);
    onIndexChange?.(next);
  };

  const clearResult = (moduleId: string) => {
    delete resultsRef.current[moduleId];
  };

  const retryModule = (moduleId: string) => {
    clearResult(moduleId);
    setAttempts((a) => ({ ...a, [moduleId]: (a[moduleId] ?? 0) + 1 }));
  };

  /** Nach dem letzten Modul: Vorschau und Gast schließen nur, sonst Station abschließen */
  const finishStation = () => {
    if (finishedRef.current) {
      onClose();
      return;
    }
    // Eine Aufgabe wurde übersprungen: keine Punkte, nur eine schlichte Endkarte
    if (forfeitedRef.current) {
      setEnded(true);
      return;
    }
    // Eingebettete Vorschau: Abschlussdialog mit Demo-Werten, ohne Punkte und ohne Standort
    if (preview && embedded) {
      setCompletion({
        durationSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
        remainingStations: Math.max(0, (arChrome.totalStations || 1) - (arChrome.completedStations + 1)),
        nextStation: upcoming[0] ?? null,
        distanceToNext: null,
      });
      return;
    }
    if (preview) {
      onClose();
      return;
    }
    if (isGuest) {
      toast.info(t('stationPlayerGuestNoPoints'), { duration: 3500 });
      onClose();
      return;
    }
    if (!canComplete) {
      onClose();
      return;
    }
    finishedRef.current = true;
    // Wie ARComponentBase: Stand VOR dem Abschluss merken (die Zähler in arChrome springen danach weiter)
    const remainingStations = Math.max(0, (arChrome.totalStations || 1) - (arChrome.completedStations + 1));
    setCompletion({
      durationSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
      remainingStations,
      nextStation: upcoming[0] ?? null,
      distanceToNext: null,
    });
    onCompleteStation?.(station.id);

    if (upcoming.length > 0 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          let nearest = upcoming[0];
          let minDistance = Infinity;
          for (const next of upcoming) {
            const distance = calculateDistance(coords.latitude, coords.longitude, next.lat, next.lng);
            if (distance < minDistance) {
              minDistance = distance;
              nearest = next;
            }
          }
          setCompletion((c) => (c ? { ...c, nextStation: nearest, distanceToNext: minDistance } : c));
        },
        () => {
          // Ohne Standort bleibt die nächste Station in Pfadreihenfolge, nur ohne Entfernung
        }
      );
    }
  };

  /** Weiter zum nächsten Modul bzw. Stationsabschluss (ohne Prüfung der Bestehensgrenze) */
  const advance = () => {
    if (isLast) finishStation();
    else goTo(safeIndex + 1);
  };

  const goNext = () => {
    const threshold = (current as { pass_threshold?: number | null } | undefined)?.pass_threshold;
    if (current && threshold != null && !isModulePassed(threshold, resultsRef.current[current.id])) {
      const result = resultsRef.current[current.id];
      setGate({ moduleId: current.id, correct: result?.correct ?? 0, total: result?.total ?? 0, threshold });
      return;
    }
    advance();
  };

  const retryGate = () => {
    if (!gate) return;
    retryModule(gate.moduleId);
    setGate(null);
  };

  const skipGate = () => {
    if (gate && !failedIdsRef.current.includes(gate.moduleId)) failedIdsRef.current.push(gate.moduleId);
    forfeitedRef.current = true;
    setGate(null);
    advance();
  };

  /** Endkarte: zum ersten nicht bestandenen Modul zurück, Station zählt wieder */
  const retryFailed = () => {
    const firstIndex = modules.findIndex((m) => failedIdsRef.current.includes(m.id));
    const target = modules[firstIndex];
    forfeitedRef.current = false;
    failedIdsRef.current = [];
    setEnded(false);
    if (!target) return;
    retryModule(target.id);
    goTo(firstIndex);
  };

  const navigateToNextStation = () => {
    const next = completion?.nextStation;
    if (!next) {
      onClose();
      return;
    }
    setCompletion(null);
    if (isIOSDevice()) {
      window.location.href = `maps://maps.apple.com/?daddr=${next.lat},${next.lng}&dirflg=w`;
    } else if (isAndroidDevice()) {
      window.location.href = `google.navigation:q=${next.lat},${next.lng}&mode=w`;
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${next.lat},${next.lng}&travelmode=walking`, '_blank');
    }
  };

  useEffect(() => {
    if (isNativeAr || embedded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (profileMenuOpen) setProfileMenuOpen(false);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const continueLabel = !isLast
    ? t('stationImageSequenceNext')
    : canComplete && !preview
      ? t('completeStation')
      : t('stationPlayerFinish');

  const completionDialog = (
    <ARStationCompletionDialog
      isOpen={completion !== null}
      stationTitle={station.title}
      stationPoints={station.points}
      durationSeconds={completion?.durationSeconds ?? 0}
      remainingStations={completion?.remainingStations ?? 0}
      totalStations={arChrome.totalStations || 1}
      distanceToNextStation={completion?.distanceToNext ?? null}
      onNavigateHome={onClose}
      onNavigateToNextStation={navigateToNextStation}
      onClose={onClose}
      container={embedded ? portalContainer : undefined}
      themeColor={station.color}
    />
  );

  if (isNativeAr && current && stage?.Native) {
    const Native = stage.Native;
    return (
      <div style={{ display: 'contents', ...theme.style }} className={theme.className}>
        <Native
          key={current.id}
          station={station}
          module={current}
          lang={lang}
          arChrome={{ ...arChrome, onNavigateHome: onClose }}
          isGuest={isGuest}
          continueLabel={continueLabel}
          onContinue={goNext}
        />
        {completionDialog}
      </div>
    );
  }

  const Player = current ? ((MODULE_PLAYERS as Record<string, unknown>)[current.type] as AnyModulePlayer | undefined) : undefined;
  const Preview = stage?.Preview;
  // Neuer Schlüssel baut den Player neu auf (Wiederholung; in der Vorschau auch bei Strukturänderungen im Editor)
  const playerKey = current ? `${current.id}:${attempts[current.id] ?? 0}:${preview ? moduleStructureKey(current) : ''}` : '';
  const brokenNote = (
    <ModuleNote text={t('stationPreviewModuleBroken')} continueLabel={continueLabel} onContinue={goNext} />
  );

  // Module mit WebGL-Fläche (immersive) nur überblenden: ein verschobenes Canvas würde ruckeln
  const noSlide = reduceMotion || !!(current && (MODULE_META as Record<string, { immersive?: true } | undefined>)[current.type]?.immersive);
  const variants = {
    enter: (d: 1 | -1) => ({ opacity: 0, x: noSlide ? 0 : d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: 1 | -1) => ({ opacity: 0, x: noSlide ? 0 : d * -40 }),
  };

  return (
    <>
      <motion.div
        ref={dialogRef}
        className={`fixed inset-0 z-[60] bg-black text-white flex flex-col${theme.className ? ` ${theme.className}` : ''}`}
        role={embedded ? 'region' : 'dialog'}
        aria-modal={embedded ? undefined : true}
        aria-label={station.title}
        style={
          {
            '--module-footer-pad': !showChrome ? FOOTER_PAD_SAFE : isProgressCompact ? FOOTER_PAD_COMPACT : FOOTER_PAD_NORMAL,
            ...theme.style,
          } as CSSProperties
        }
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24 }}
      >
        {/* Kopf: ohne AR-Chrome am oberen Rand, sonst unter der ARTopBar (gleicher Abstand wie das Profilmenü) */}
        <div
          className="px-4 pb-3 flex-shrink-0"
          style={{ paddingTop: !showChrome ? 'max(16px, env(safe-area-inset-top, 0px))' : 'calc(max(14px, env(safe-area-inset-top, 0px)) + 72px)' }}
        >
          {modules.length > 0 && (
            <div className="flex gap-1" aria-hidden="true">
              {modules.map((m, i) => (
                <span key={m.id} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= safeIndex ? 'bg-white' : 'bg-white/25'}`} />
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              {preview && !embedded && (
                <span className="mb-1.5 inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
                  {t('stationPlayerPreview')}
                </span>
              )}
              <p className="font-bold truncate">{station.title}</p>
              {current && (
                <p className="text-sm text-white/80 tabular-nums truncate">
                  {t('stationPlayerPart', { current: safeIndex + 1, total: modules.length })}
                </p>
              )}
            </div>
            {safeIndex > 0 && (
              <button type="button" onClick={() => goTo(safeIndex - 1)} aria-label={t('back')} className={stageButtonClass}>
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {preview && !embedded && (
              <button type="button" onClick={onClose} aria-label={t('close')} className={stageButtonClass}>
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Aktuelles Modul */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          {gate || ended ? (
            gate ? (
              <ModuleGate
                icon={<RotateCcw className="w-7 h-7" />}
                title={t('stationResultsGateTitle')}
                body={gate.total > 1 ? t('stationResultsGateBody', { correct: gate.correct, total: gate.total, threshold: gate.threshold }) : t('stationResultsGateBodySingle')}
                primaryLabel={t('stationResultsRetry')}
                onPrimary={retryGate}
                secondaryLabel={t('stationResultsSkip')}
                onSecondary={skipGate}
              />
            ) : (
              <ModuleGate
                icon={<Layers className="w-7 h-7" />}
                title={t('stationResultsEndedTitle')}
                body={t('stationResultsEndedBody')}
                primaryLabel={t('stationResultsRetryFailed')}
                onPrimary={retryFailed}
                secondaryLabel={t('close')}
                onSecondary={onClose}
              />
            )
          ) : current ? (
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={current.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease }}
                className="absolute inset-0"
              >
                {preview && moduleMissingContent(current) ? (
                  <ModuleNote text={t('stationPreviewModuleIncomplete')} continueLabel={continueLabel} onContinue={goNext} />
                ) : (
                  <ModuleBoundary resetKey={playerKey} fallback={brokenNote}>
                    {stage ? (
                      Preview ? (
                        <Preview key={playerKey} module={current} lang={lang} continueLabel={continueLabel} onContinue={goNext} />
                      ) : (
                        brokenNote
                      )
                    ) : Player ? (
                      <Player
                        key={playerKey}
                        module={current}
                        lang={lang}
                        preview={preview}
                        continueLabel={continueLabel}
                        onContinue={goNext}
                        onResult={(r) => {
                          resultsRef.current[current.id] = r;
                        }}
                        stationTitle={station.title}
                      />
                    ) : (
                      brokenNote
                    )}
                  </ModuleBoundary>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center px-5 text-center">
              <span className="w-14 h-14 mb-4 rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center" aria-hidden="true">
                <Layers className="w-7 h-7" />
              </span>
              <p className="text-[16px] leading-relaxed text-white/90 max-w-xs">{t('stationPlayerEmpty')}</p>
              <div className="mt-6 flex w-full max-w-xs" style={{ paddingBottom: 'var(--module-footer-pad)' }}>
                <PrimaryButton onClick={onClose}>{t('close')}</PrimaryButton>
              </div>
            </div>
          )}
        </div>

        {/* Gleiche AR-Oberfläche wie in den AR-Stationen – in der eingebetteten Vorschau mit Demo-Werten */}
        {showChrome && (
          <div className="ar-ui-overlay">
            <ARTopBar
              onNavigateHome={onClose}
              onProfileClick={() => setProfileMenuOpen(!profileMenuOpen)}
              profileMenuOpen={profileMenuOpen}
              username={arChrome.username}
            />
            <ARProgressBar progress={progress} stations={stations} onCompactChange={setIsProgressCompact} />
            <ARProfileMenu
              isOpen={profileMenuOpen}
              onClose={() => setProfileMenuOpen(false)}
              username={arChrome.username}
              onLogin={arChrome.onLogin}
              onLogout={arChrome.onLogout}
              onNavigateProfile={arChrome.onNavigateProfile}
              onRegister={arChrome.onRegister}
            />
          </div>
        )}
      </motion.div>
      {completionDialog}
    </>
  );
}
