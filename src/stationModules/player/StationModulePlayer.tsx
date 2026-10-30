import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, Layers, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { ARTopBar } from '../../components/ARComponents/ARTopBar';
import { ARProgressBar, buildARProgress } from '../../components/ARComponents/ARProgressBar';
import { ARProfileMenu } from '../../components/ARComponents/ARProfileMenu';
import { ARStationCompletionDialog } from '../../components/ARComponents/ARStationCompletionDialog';
import { calculateDistance } from '../../components/ARComponents/ARComponentBase';
import { STATIONS_COORDINATES, type StationCoordinates } from '../../data/stationsConfig';
import '../../components/ARComponents/ARComponents.css';
import { MODULE_META } from '../meta';
import { pickLang, type StationModule } from '../types';
import type { StationModulePlayerProps } from './contract';
import { ArPanoramaEmbedded, ArPanoramaPlaceholder, isArCapableDevice } from './ArPanoramaStage';
import { MODULE_PLAYERS } from './players';
import { PrimaryButton } from './ui';
import { useDialogFocus } from '../../lib/useDialogFocus';

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
  stationTitle?: string;
}>;

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
}: StationModulePlayerProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const modules = station.modules;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isProgressCompact, setIsProgressCompact] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { progress, stations } = buildARProgress(arChrome.completedStations, arChrome.totalStations, arChrome.totalPoints);

  const startedAtRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const [completion, setCompletion] = useState<{
    durationSeconds: number;
    remainingStations: number;
    nextStation: StationCoordinates | null;
    distanceToNext: number | null;
  } | null>(null);
  // Tab bleibt im Player (Escape regelt der Tastatur-Effekt unten); aus, solange der Abschlussdialog offen ist
  useDialogFocus(dialogRef, completion === null);

  const safeIndex = Math.min(index, Math.max(modules.length - 1, 0));
  const current = modules[safeIndex];
  const isLast = safeIndex === modules.length - 1;
  // Auf dem Handy bringt der AR-Rundumblick seine eigene AR-Oberfläche mit und braucht den ganzen Bildschirm
  const isNativeAr = !!current && current.type === 'ar_panorama' && !preview && isArCapableDevice();

  const goTo = (next: number) => {
    if (next < 0 || next >= modules.length) return;
    setDirection(next > safeIndex ? 1 : -1);
    setIndex(next);
  };

  /** Nach dem letzten Modul: Vorschau und Gast schließen nur, sonst Station abschließen */
  const finishStation = () => {
    if (finishedRef.current) {
      onClose();
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
    const nextStations = STATIONS_COORDINATES.filter((_, i) => i >= progress.current - 1).slice(1);
    setCompletion({
      durationSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
      remainingStations,
      nextStation: nextStations[0] ?? null,
      distanceToNext: null,
    });
    onCompleteStation?.(station.id);

    if (nextStations.length > 0 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          let nearest = nextStations[0];
          let minDistance = Infinity;
          for (const next of nextStations) {
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

  const goNext = () => {
    if (isLast) finishStation();
    else goTo(safeIndex + 1);
  };

  const navigateToNextStation = () => {
    const next = completion?.nextStation;
    if (!next) {
      onClose();
      return;
    }
    setCompletion(null);
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      window.location.href = `maps://maps.apple.com/?daddr=${next.lat},${next.lng}&dirflg=w`;
    } else if (/Android/.test(navigator.userAgent)) {
      window.location.href = `google.navigation:q=${next.lat},${next.lng}&mode=w`;
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${next.lat},${next.lng}&travelmode=walking`, '_blank');
    }
  };

  useEffect(() => {
    if (isNativeAr) return;
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
    />
  );

  if (isNativeAr && current?.type === 'ar_panorama') {
    return (
      <>
        <ArPanoramaEmbedded
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
      </>
    );
  }

  const Player = current && current.type !== 'ar_panorama' ? (MODULE_PLAYERS[current.type] as unknown as AnyModulePlayer) : null;

  const variants = {
    enter: (d: 1 | -1) => ({ opacity: 0, x: reduceMotion ? 0 : d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: 1 | -1) => ({ opacity: 0, x: reduceMotion ? 0 : d * -40 }),
  };

  return (
    <>
      <motion.div
        ref={dialogRef}
        className="fixed inset-0 z-[60] bg-black text-white flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={station.title}
        style={{ '--module-footer-pad': preview ? FOOTER_PAD_SAFE : isProgressCompact ? FOOTER_PAD_COMPACT : FOOTER_PAD_NORMAL } as CSSProperties}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24 }}
      >
        {/* Kopf: in der Vorschau am oberen Rand, sonst unter der ARTopBar (gleicher Abstand wie das Profilmenü) */}
        <div
          className="px-4 pb-3 flex-shrink-0"
          style={{ paddingTop: preview ? 'max(16px, env(safe-area-inset-top, 0px))' : 'calc(max(14px, env(safe-area-inset-top, 0px)) + 72px)' }}
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
              {preview && (
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
            {preview && (
              <button type="button" onClick={onClose} aria-label={t('close')} className={stageButtonClass}>
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Aktuelles Modul */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          {current ? (
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
                {current.type === 'ar_panorama' ? (
                  <ArPanoramaPlaceholder module={current} lang={lang} continueLabel={continueLabel} onContinue={goNext} />
                ) : (
                  Player && <Player module={current} lang={lang} preview={preview} continueLabel={continueLabel} onContinue={goNext} stationTitle={station.title} />
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

        {/* Gleiche AR-Oberfläche wie in den AR-Stationen – gehört zur echten Station, nicht zur Vorschau */}
        {!preview && (
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
