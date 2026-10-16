import { X, CheckCircle2, Navigation, Play, AlertCircle, LogIn, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Georgi } from './Georgi';
import { Trophy } from 'lucide-react';
import { MapPin, Clock, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStationProximity } from './ARComponents/ARComponentBase';
import { useLanguage } from '../contexts/LanguageContext';
import { GuestWarningDialog } from './GuestWarningDialog';
import { StationImageSequence, type ARChromeProps, type StationImageSlide } from './StationAdminPanel/StationImageSequence';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface StationDetailProps {
  station: {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    longDescription: string;
    points: number;
    status: 'locked' | 'available' | 'completed';
    quiz?: QuizQuestion;
    arContent?: string;
    latitude: number;
    longitude: number;
    /** Bildfolge, die beim Start durchgeklickt wird (Stationen aus der Stationsverwaltung) */
    imageSequence?: StationImageSlide[];
    /** AR-Route für Stationen aus der Stationsverwaltung (360°-Quiz), sonst aus STATION_AR_ROUTES */
    arRoute?: string;
  };
  onClose: () => void;
  onComplete: (stationId: number) => void;
  isLoggedIn?: boolean;
  requireLoginForAR?: boolean;
  allowGuestARStart?: boolean;
  onEnableGuestStart?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
  /** AR-Oberfläche (Top-Bar, Fortschrittsleiste) für die Bildfolge – wie in den AR-Stationen */
  arChrome: ARChromeProps;
}

// Station ID to AR Route mapping
const STATION_AR_ROUTES: Record<number, string> = {
  1: '/glockenspiel',    // Historisches Rathaus
  2: '/bahnhof',         // Bahnhof
  3: '/phonomuseum',     // Heimatmuseum
  4: '/schwarzes-tor',   // Schwarzes Tor
  5: '/klosterweiher',   // Aussichtspunkt Hörnle
};

export function StationDetail({ station, onClose, onComplete, isLoggedIn, requireLoginForAR = true, allowGuestARStart = false, onEnableGuestStart, onNavigateToLogin, onNavigateToRegister, arChrome }: StationDetailProps) {
  const [showGeorgi, setShowGeorgi] = useState(true);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isCompleted = station.status === 'completed';

  // Proximity check - only for stations with AR routes
  const RADIUS_METERS = 100;
  const arRoute = STATION_AR_ROUTES[station.id] ?? station.arRoute;
  const hasARRoute = !!arRoute;
  // Gleiche Login-Regeln für alle Stationen (AR und Stationsverwaltung): ohne Login erst Login-Karte,
  // als Gast darf man die Station erleben, schließt sie aber nicht ab (wie der AR-Abschlussbutton)
  const needsLogin = requireLoginForAR && isLoggedIn === false;
  const isGuest = isLoggedIn === false;
  const { distance, isWithinRadius, locationError } = useStationProximity(
    station.latitude,
    station.longitude,
    RADIUS_METERS
  );

  const handleNavigateToStation = () => {
    // Open Google Maps with directions to the station
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    window.open(mapsUrl, '_blank');
  };

  const handleStartARExperience = () => {
    // Navigate to AR view - proximity check happens there
    if (arRoute) {
      navigate(arRoute, {
        state: allowGuestARStart ? { allowGuestStart: true } : undefined,
      });
    } else if (imageSequence.length > 0) {
      setImageSequenceOpen(true);
    } else {
      // Fallback: Mark as completed if no AR route
      onComplete(station.id);
    }
  };

  const navigateLabel = t('navigateToStation', { stationName: station.title });

  // Stationen ohne AR werden vor Ort abgeschlossen: erst die Bildfolge, dann ggf. das Quiz
  const canCompleteOnSite = !hasARRoute && !locationError && isWithinRadius;
  const imageSequence = station.imageSequence ?? [];
  const [imageSequenceOpen, setImageSequenceOpen] = useState(false);
  const [imageSequenceDone, setImageSequenceDone] = useState(false);
  const imageSequencePending = imageSequence.length > 0 && !imageSequenceDone;
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizWrong, setQuizWrong] = useState(false);

  const handleCompleteInfoStation = () => {
    if (station.quiz && quizAnswer !== station.quiz.correctAnswer) {
      setQuizWrong(true);
      return;
    }
    onComplete(station.id);
  };

  const handleImageSequenceFinish = () => {
    setImageSequenceOpen(false);
    if (isCompleted || isGuest) return;
    setImageSequenceDone(true);
    if (!station.quiz) onComplete(station.id);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-background z-50 overflow-y-auto overscroll-contain"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 34, stiffness: 320 }}
    >
      {/* Hero */}
      <div className="relative h-[clamp(260px,42dvh,380px)] overflow-hidden">
        <ImageWithFallback
          src={station.imageUrl}
          alt={station.title}
          fetchPriority="high"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/0 to-black/70" aria-hidden="true" />

        <div
          className="absolute inset-x-0 top-0 flex items-center justify-between px-4"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}
        >
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/50 transition-colors pressable"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/20 px-3.5 py-2 text-white">
            <Trophy className="w-4 h-4 text-gold-bright" />
            <span className="text-sm font-bold tabular-nums">{station.points} {t('points')}</span>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-10 max-w-md mx-auto">
          {isCompleted && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('completed')}
            </span>
          )}
          <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-tight text-white drop-shadow-sm">{station.title}</h1>
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-[28px] bg-background">
        <div className="max-w-md mx-auto px-4 pt-6 pb-32 space-y-5">
          <p className="text-[15px] leading-relaxed text-gray-700 px-1 whitespace-pre-line">
            {station.longDescription}
          </p>

          {/* LOGIN-GATE */}
          {needsLogin && (
            <motion.div
              className="surface-card p-6 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="w-14 h-14 rounded-2xl bg-primary-soft text-primary mx-auto mb-4 flex items-center justify-center">
                <LogIn className="w-6 h-6" />
              </span>
              <h3 className="font-bold text-lg">{t('loginRequired')}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 mb-6 leading-relaxed">
                {t('loginToStartAR')}
              </p>
              <div className="space-y-2.5">
                <button
                  onClick={onNavigateToLogin}
                  className="w-full h-13 min-h-[52px] bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable"
                >
                  <LogIn className="w-5 h-5" />
                  <span>{t('loginNow')}</span>
                </button>
                {onNavigateToRegister && (
                  <button
                    onClick={onNavigateToRegister}
                    className="w-full min-h-[52px] bg-card text-primary border-2 border-primary/25 hover:border-primary rounded-2xl font-bold transition-colors pressable"
                  >
                    {t('createAccount')}
                  </button>
                )}
                <button
                  onClick={() => setShowGuestWarning(true)}
                  className="w-full min-h-[48px] rounded-2xl font-semibold text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-gold" />
                  {t('startStationAsGuest')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Standortfehler */}
          {!needsLogin && hasARRoute && locationError && !isCompleted && (
            <motion.div
              className="rounded-[24px] bg-gold-soft border border-gold/25 p-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </span>
                <div className="w-full min-w-0">
                  <h3 className="font-bold text-gold-foreground">{t('locationAccessRequired')}</h3>
                  <p className="text-sm text-gold-foreground/80 mt-1 mb-4 leading-snug">
                    {locationError}
                  </p>
                  <button
                    onClick={handleNavigateToStation}
                    className="w-full min-h-[52px] bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors pressable"
                  >
                    <Navigation className="w-5 h-5" />
                    <span>{navigateLabel}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Zu weit entfernt */}
          {!needsLogin && hasARRoute && !locationError && distance !== null && !isWithinRadius && !isCompleted && (
            <motion.div
              className="relative overflow-hidden rounded-[24px] bg-gray-900 text-white p-6 text-center shadow-lg"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="topo-texture absolute inset-0 opacity-60" aria-hidden="true" />
              <div className="relative">
                <span className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-gold/25 animate-ping" style={{ animationDuration: '2.4s' }} aria-hidden="true" />
                  <span className="relative w-16 h-16 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center">
                    <MapPin className="w-7 h-7 text-gold-bright" />
                  </span>
                </span>
                <h3 className="font-bold text-lg">{t('tooFarAway')}</h3>
                <p className="mt-3 text-4xl font-extrabold tabular-nums text-gold-bright">
                  {distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`}
                </p>
                <p className="text-xs text-white/60 mt-1">{t('estimatedDistance')}</p>
                <p className="text-sm text-white/75 mt-4 mb-6 leading-relaxed">
                  {t('getCloserDistance')}
                </p>
                <button
                  onClick={handleNavigateToStation}
                  className="w-full min-h-[52px] bg-white text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors pressable"
                >
                  <Navigation className="w-5 h-5" />
                  <span>{navigateLabel}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* In Reichweite */}
          {!needsLogin && hasARRoute && !locationError && isWithinRadius && !isCompleted && (
            <motion.div
              className="brand-gradient relative overflow-hidden text-white rounded-[24px] p-6 text-center shadow-lg"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="topo-texture absolute inset-0" aria-hidden="true" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1.5 rounded-full mb-4">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">{t('withinRange', { distance: Math.round(distance!) })}</span>
                </div>
                <h3 className="font-bold text-xl">{t('arExperienceAvailable')}</h3>
                <p className="text-sm text-white/85 mt-1.5 mb-6 leading-relaxed">
                  {t('closeEnoughDescription')}
                </p>
                <div className="space-y-2.5">
                  <button
                    onClick={handleStartARExperience}
                    className="w-full min-h-[56px] bg-white text-primary rounded-2xl font-extrabold flex items-center justify-center gap-2 shadow-lg pressable"
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    <span>{t('startARExperience')}</span>
                  </button>
                  <button
                    onClick={handleNavigateToStation}
                    className="w-full min-h-[48px] bg-white/12 hover:bg-white/20 text-white border border-white/25 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{navigateLabel}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Ohne AR (z. B. Stationen aus der Stationsverwaltung): vor Ort abschließen, ggf. mit Quiz */}
          {!needsLogin && !isCompleted && !hasARRoute && (
            <motion.div
              className="surface-card p-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-bold text-lg text-center">{t('informationStation')}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 mb-5 text-center">
                {!canCompleteOnSite
                  ? imageSequence.length > 0 ? t('stationImageSequenceGoThere') : t('noARExperience')
                  : imageSequencePending
                    ? t('stationImageSequenceIntro')
                    : isGuest
                      ? t('stationGuestNoCompletion')
                      : station.quiz
                        ? t('stationQuizIntro')
                        : t('stationCompleteOnSite')}
              </p>
              {isGuest && canCompleteOnSite && imageSequencePending && (
                <p className="-mt-3 mb-5 flex items-center justify-center gap-2 text-center text-sm text-gold-foreground">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-gold" />
                  {t('stationGuestNoCompletion')}
                </p>
              )}

              {canCompleteOnSite && !imageSequencePending && !isGuest && station.quiz && (
                <fieldset className="mb-5">
                  <legend className="font-bold mb-3">{station.quiz.question}</legend>
                  <div className="space-y-2">
                    {station.quiz.options.map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        aria-pressed={quizAnswer === index}
                        onClick={() => {
                          setQuizAnswer(index);
                          setQuizWrong(false);
                        }}
                        className={`w-full min-h-[48px] px-4 py-2.5 rounded-2xl border-2 text-left font-semibold transition-colors ${quizAnswer === index
                          ? 'border-primary bg-primary-soft text-primary-dark'
                          : 'border-border bg-card hover:border-border-strong'
                          }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {quizWrong && (
                    <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-semibold text-destructive">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {t('stationQuizWrong')}
                    </p>
                  )}
                </fieldset>
              )}

              <div className="space-y-2.5">
                {canCompleteOnSite && imageSequencePending && (
                  <button
                    onClick={() => setImageSequenceOpen(true)}
                    className="w-full min-h-[52px] bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable"
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    <span>{t('stationImageSequenceStart')}</span>
                  </button>
                )}
                {canCompleteOnSite && !imageSequencePending && !isGuest && (
                  <button
                    onClick={handleCompleteInfoStation}
                    disabled={!!station.quiz && quizAnswer === null}
                    className="w-full min-h-[52px] bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-primary transition-colors pressable disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{t('completeStation')}</span>
                  </button>
                )}
                <button
                  onClick={handleNavigateToStation}
                  className={canCompleteOnSite
                    ? 'w-full min-h-[48px] bg-card text-primary border-2 border-primary/25 hover:border-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors pressable'
                    : 'w-full min-h-[52px] bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors pressable'}
                >
                  <Navigation className="w-5 h-5" />
                  <span>{navigateLabel}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Abgeschlossen */}
          {isCompleted && (
            <div className="rounded-[24px] bg-primary-soft p-6 text-center">
              <span className="w-14 h-14 rounded-full bg-primary text-white mx-auto mb-3 flex items-center justify-center shadow-primary">
                <CheckCircle2 className="w-7 h-7" />
              </span>
              <h3 className="font-bold text-lg text-primary-dark">{t('stationCompleted')}</h3>
              <p className="text-sm text-gray-700 mt-1 mb-5">
                {t('stationCompletedReplay')}
              </p>
              <button
                onClick={handleStartARExperience}
                className="w-full min-h-[52px] bg-card text-primary border border-primary/25 hover:border-primary rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors pressable"
              >
                <Play className="w-5 h-5" />
                <span>{t('repeatStation')}</span>
              </button>
            </div>
          )}

          {/* Gut zu wissen */}
          <div className="surface-card p-5">
            <h4 className="font-bold mb-3">{t('stationFunFacts')}</h4>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center flex-shrink-0"><MapPin className="w-4 h-4" /></span>
                <span>{t('stationLocation')}</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4" /></span>
                <span>{t('stationEstimatedDuration')}</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center flex-shrink-0"><Target className="w-4 h-4" /></span>
                <span>{t('stationDifficulty')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Georgi Helper */}
      <Georgi
        message={
          needsLogin
            ? t('georgiStationNeedsLogin')
            : hasARRoute && isWithinRadius && !locationError
            ? t('georgiStationCanStartAR')
            : hasARRoute && distance !== null
            ? t('georgiStationDistanceHint', { distance: Math.round(distance) })
            : t('georgiStationVisitOnSite')
        }
        show={showGeorgi && !isCompleted}
        onClose={() => setShowGeorgi(false)}
        position="bottom-right"
      />

      {createPortal(
        <AnimatePresence>
          {imageSequenceOpen && (
            <StationImageSequence
              title={station.title}
              slides={imageSequence}
              finishLabel={isCompleted || isGuest ? t('stationImageSequenceFinish') : station.quiz ? t('stationImageSequenceToQuiz') : t('completeStation')}
              onFinish={handleImageSequenceFinish}
              onClose={() => setImageSequenceOpen(false)}
              arChrome={arChrome}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      <GuestWarningDialog
        open={showGuestWarning}
        onCancel={() => setShowGuestWarning(false)}
        onContinue={() => {
          setShowGuestWarning(false);
          onEnableGuestStart?.();
          // AR: Proximity prüft die AR-Ansicht; Bildfolge nur vor Ort direkt starten
          if (hasARRoute) handleStartARExperience();
          else if (canCompleteOnSite && imageSequence.length > 0) setImageSequenceOpen(true);
        }}
      />
    </motion.div>
  );
}