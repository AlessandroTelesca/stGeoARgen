import { useState } from 'react';
import { Trophy, Flag, Gift, Lock, Check, ChevronDown, ChevronRight, ArrowRight, QrCode } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePointConfig } from '../contexts/PointConfigContext';
import { PathCard } from './PathCard';
import { CountUp } from './CountUp';

interface Path {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  totalStations: number;
  completedStations: number;
  totalPoints: number;
  earnedPoints: number;
  estimatedTime: string;
  difficulty: 'Einfach' | 'Mittel' | 'Schwer';
}

interface DashboardProps {
  paths: Path[];
  totalPoints: number;
  /** Pfad, in dem der User zuletzt eine Station abgeschlossen hat */
  lastProgressPathId: string | null;
  onPathSelect: (pathId: string) => void;
  onNavigateToPaths?: () => void;
  onOpenQRScanner?: () => void;
  onNavigate?: (view: string) => void;
  username?: string | null;
  onNavigateToLogin?: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

/** Titel + Stations-Spur eines Themenpfads auf der Reise-Karte. */
function JourneyPathTrack({ path, isLoggedIn, showCount = false }: { path: Path; isLoggedIn: boolean; showCount?: boolean }) {
  const pathShown = isLoggedIn ? path.completedStations : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs font-semibold text-white/80 truncate">{path.title}</p>
        {showCount && isLoggedIn && (
          <span className="flex-shrink-0 text-xs font-bold text-white/80 tabular-nums">
            {path.completedStations}/{path.totalStations}
          </span>
        )}
      </div>
      <div className="flex items-center" aria-hidden="true">
        {Array.from({ length: path.totalStations }).map((_, i) => {
          const done = i < pathShown;
          const isNext = i === pathShown && isLoggedIn;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <motion.span
                className={`relative flex items-center justify-center rounded-full w-8 h-8 flex-shrink-0 ${done
                  ? 'bg-white text-primary shadow-md'
                  : isNext
                    ? 'bg-white/15 ring-2 ring-white text-white mi-beacon'
                    : 'bg-white/12 ring-1 ring-white/25'
                  }`}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.45, ease }}
              >
                {done ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : isNext ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                ) : (
                  <span className="text-xs font-bold text-white/60">{i + 1}</span>
                )}
              </motion.span>
              {i < path.totalStations - 1 && (
                <span className={`h-[3px] flex-1 mx-1 rounded-full ${i + 1 < pathShown ? 'bg-white' : i === pathShown - 1 ? 'bg-gradient-to-r from-white to-white/25' : 'bg-white/20'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Dashboard({ paths, totalPoints, lastProgressPathId, onPathSelect, onNavigateToPaths, onOpenQRScanner, onNavigate, username, onNavigateToLogin }: DashboardProps) {
  const { t } = useLanguage();
  const isLoggedIn = Boolean(username);
  const [showOtherPaths, setShowOtherPaths] = useState(false);

  // Reise-Karte zeigt nur den zuletzt fortgeschrittenen Pfad; Fortschritt nie über alle Stationen summiert
  const journeyPath =
    paths.find(path => path.id === lastProgressPathId)
    ?? paths.find(path => path.completedStations > 0)
    ?? paths[0];
  const otherPaths = paths.filter(path => path !== journeyPath);
  const journeyCompleted = journeyPath ? journeyPath.completedStations : 0;
  const journeyTotal = journeyPath ? journeyPath.totalStations : 0;
  const journeyPercentage = journeyTotal > 0 ? (journeyCompleted / journeyTotal) * 100 : 0;
  const journeyRemaining = journeyTotal - journeyCompleted;

  const completedPaths = paths.filter(path => path.completedStations === path.totalStations).length;

  // Nächste Gutschein-Schwelle: Preise der Shop-Gutscheine aus der DB
  const { voucherPrices } = usePointConfig();
  const highestVoucherPrice = voucherPrices[voucherPrices.length - 1] as number | undefined;
  const nextMilestone = voucherPrices.find(m => m > totalPoints) ?? highestVoucherPrice;
  const allVouchersUnlocked = highestVoucherPrice !== undefined && totalPoints >= highestVoucherPrice;
  const pointsToNextVoucher = nextMilestone === undefined ? 0 : nextMilestone - totalPoints;
  const hasUnlockedVoucher = voucherPrices.length > 0 && totalPoints >= voucherPrices[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12">
        {/* Begrüßung */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <h2 className="text-[28px] leading-[1.15] font-extrabold tracking-tight">
            {getGreeting()}{username ? `, ${username}` : ''}!
          </h2>
          <p className="text-muted-foreground mt-1.5">{t('readyForAdventure')}</p>
        </motion.div>

        {/* Reise-Karte */}
        <motion.div
          className="brand-gradient relative w-full overflow-hidden rounded-[28px] text-white shadow-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease }}
        >
          <div className="topo-texture pointer-events-none absolute inset-0" aria-hidden="true" />
          <img
            src="/Logo.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -bottom-8 w-40 h-40 opacity-[0.08]"
            style={{ filter: 'brightness(0) invert(1)' }}
          />

          <button
            type="button"
            onClick={() => (isLoggedIn ? onNavigate?.('progress') : onNavigateToLogin?.())}
            className="group relative block w-full p-6 text-left pressable"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xl font-bold">{t('yourJourney')}</h3>
                <p className="text-sm text-white/80 mt-1">
                  {isLoggedIn
                    ? t('explorationsStats').replace('{completed}', String(journeyCompleted)).replace('{total}', String(journeyTotal))
                    : t('journeyGuestHint')}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-sm font-bold tabular-nums">
                {isLoggedIn ? <><CountUp value={Math.round(journeyPercentage)} delay={0.3} />%</> : <Lock className="w-4 h-4 my-0.5" />}
              </span>
            </div>

            {journeyPath && (
              <div className="mt-6 mb-5">
                <JourneyPathTrack path={journeyPath} isLoggedIn={isLoggedIn} />
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white/90">
                {isLoggedIn
                  ? journeyTotal > 0 && journeyRemaining === 0
                    ? t('pathCompleted')
                    : t('stationsRemaining').replace('{remaining}', String(journeyRemaining))
                  : t('loginNow')}
              </p>
              <span className="w-9 h-9 rounded-full bg-white text-primary flex items-center justify-center flex-shrink-0 shadow-md">
                <ArrowRight className="w-4 h-4 nudge-x" />
              </span>
            </div>
          </button>

          {/* Weitere Themenpfade, aufklappbar */}
          {otherPaths.length > 0 && (
            <div className="relative px-6 pb-5">
              <button
                type="button"
                onClick={() => setShowOtherPaths(open => !open)}
                aria-expanded={showOtherPaths}
                aria-controls="journey-other-paths"
                className="mx-auto flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/25 transition-colors"
              >
                {showOtherPaths ? t('hideOtherPaths') : t('showOtherPaths')}
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showOtherPaths ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {showOtherPaths && (
                  <motion.div
                    id="journey-other-paths"
                    className="overflow-hidden -mx-4 -mb-4"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease }}
                  >
                    <div className="px-4 pt-5 pb-4 space-y-5">
                      {otherPaths.map(path => (
                        <JourneyPathTrack key={path.id} path={path} isLoggedIn={isLoggedIn} showCount />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Kennzahlen */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <motion.button
            onClick={() => (isLoggedIn ? onNavigate?.('points') : onNavigateToLogin?.())}
            className="surface-card flex items-center gap-3 p-4 text-left pressable hover:shadow-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5, ease }}
          >
            <span className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${isLoggedIn ? 'bg-gold-soft text-gold' : 'bg-muted text-muted-foreground'}`}>
              {isLoggedIn ? <Trophy className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </span>
            <span className="min-w-0">
              <p className="text-xl font-extrabold leading-tight tabular-nums">{isLoggedIn ? <CountUp value={totalPoints} delay={0.25} /> : '—'}</p>
              <p className="text-xs text-muted-foreground truncate">{t('points')}</p>
            </span>
          </motion.button>

          <motion.button
            onClick={() => (isLoggedIn ? onNavigateToPaths?.() : onNavigateToLogin?.())}
            className="surface-card flex items-center gap-3 p-4 text-left pressable hover:shadow-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.5, ease }}
          >
            <span className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${isLoggedIn ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground'}`}>
              {isLoggedIn ? <Flag className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </span>
            <span className="min-w-0">
              <p className="text-xl font-extrabold leading-tight tabular-nums">{isLoggedIn ? completedPaths : '—'}</p>
              <p className="text-xs text-muted-foreground truncate">{t('pathsDoneShort')}</p>
            </span>
          </motion.button>
        </div>

        {/* Themenpfade */}
        <section className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <h3 className="text-lg font-bold tracking-tight">{t('themenPaths')}</h3>
            {paths.length > 0 && (
              <button
                onClick={onNavigateToPaths}
                className="group text-sm font-semibold text-primary hover:text-primary-dark transition-colors flex items-center gap-0.5 -mr-1 px-1 py-1"
              >
                {t('viewAll')}
                <ChevronRight className="w-4 h-4 nudge-x" />
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {paths.map((path, index) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.08, duration: 0.55, ease }}
              >
                <PathCard {...path} onClick={() => onPathSelect(path.id)} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Schnellzugriff */}
        <motion.section
          className="surface-card mt-6 overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.55, ease }}
        >
          {onOpenQRScanner && (
            <button
              onClick={onOpenQRScanner}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors group"
            >
              <span className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-primary">
                <QrCode className="w-6 h-6" />
              </span>
              <span className="flex-1 min-w-0">
                <h4 className="font-bold">{t('qrCodeScan')}</h4>
                <p className="text-sm text-muted-foreground leading-snug mt-0.5">{t('qrCodeScanDesc')}</p>
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary nudge-x flex-shrink-0" />
            </button>
          )}

          {onOpenQRScanner && <div className="h-px bg-border mx-4" />}

          <button
            onClick={() => onNavigate?.('rewards')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors group"
          >
            <span className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${hasUnlockedVoucher ? 'bg-gold-soft text-gold' : 'bg-muted text-muted-foreground'}`}>
              {/* Freigeschalteter Gutschein: das Geschenk wackelt einmal kurz */}
              <Gift className={`w-6 h-6 ${hasUnlockedVoucher ? 'mi-wiggle' : ''}`} />
            </span>
            <span className="flex-1 min-w-0">
              <h4 className="font-bold">
                {hasUnlockedVoucher ? t('voucherAvailable') : t('nextVoucher')}
              </h4>
              <p className="text-sm text-muted-foreground leading-snug mt-0.5">
                {nextMilestone === undefined
                  ? t('noVouchersAvailable')
                  : allVouchersUnlocked
                    ? t('allVouchersUnlocked')
                    : pointsToNextVoucher === 0
                      ? t('congratsNewVoucher')
                      : t('pointsToNextVoucher').replace('{points}', String(pointsToNextVoucher))}
              </p>
              {nextMilestone !== undefined && !allVouchersUnlocked && (
                <span className="mt-3 block">
                  <span className="block h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.span
                      className="block h-full rounded-full bg-gradient-to-r from-gold to-gold-bright"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (totalPoints / nextMilestone) * 100)}%` }}
                      transition={{ duration: 0.9, delay: 0.6, ease }}
                    />
                  </span>
                  <span className="mt-1.5 flex items-center justify-between text-xs tabular-nums">
                    <span className="font-semibold text-gold-foreground">{totalPoints} {t('points')}</span>
                    <span className="text-muted-foreground">{nextMilestone} {t('points')}</span>
                  </span>
                </span>
              )}
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary nudge-x flex-shrink-0" />
          </button>
        </motion.section>
      </div>
    </div>
  );
}
