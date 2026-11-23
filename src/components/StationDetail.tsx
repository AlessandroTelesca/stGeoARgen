import { X, CheckCircle2, Navigation, Play, AlertCircle, LogIn, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Georgi } from './Georgi';
import { Trophy } from 'lucide-react';
import { MapPin, Clock, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStationProximity } from './ARComponents/ARComponentBase';
import { useLanguage } from '../contexts/LanguageContext';
import { GuestWarningDialog } from './GuestWarningDialog';
import { stationThemeProps } from '../lib/stationTheme';

interface StationDetailProps {
  station: {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    longDescription: string;
    points: number;
    status: 'locked' | 'available' | 'completed';
    arContent?: string;
    latitude: number;
    longitude: number;
    /** Route der Modul-Bühne für Stationen aus der Stationsverwaltung, sonst aus STATION_AR_ROUTES */
    arRoute?: string;
    /** Station aus der Stationsverwaltung enthält das Modul „AR-Rundumblick“ */
    hasArModule?: boolean;
    /** Akzentfarbe der Station (#rrggbb); null → Standard-Tannengrün */
    color?: string | null;
  };
  onClose: () => void;
  onComplete: (stationId: number) => void;
  isLoggedIn?: boolean;
  requireLoginForAR?: boolean;
  allowGuestARStart?: boolean;
  onEnableGuestStart?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
  /** Vorschau im Admin-Handyrahmen: feste Zustände statt Standort/Login, Start ruft onStart */
  preview?: {
    state: 'in_range' | 'too_far' | 'needs_login' | 'completed';
    onStart: () => void;
  };
}

/** Feste Entfernung der Vorschau-Zustände (in Metern) */
const PREVIEW_DISTANCE_TOO_FAR = 240;
const PREVIEW_DISTANCE_IN_RANGE = 40;

// Station ID to AR Route mapping
const STATION_AR_ROUTES: Record<number, string> = {
  1: '/glockenspiel',    // Historisches Rathaus
  2: '/bahnhof',         // Bahnhof
  3: '/phonomuseum',     // Heimatmuseum
  4: '/schwarzes-tor',   // Schwarzes Tor
  5: '/klosterweiher',   // Aussichtspunkt Hörnle
};

export function StationDetail({ station, onClose, onComplete, isLoggedIn, requireLoginForAR = true, allowGuestARStart = false, onEnableGuestStart, onNavigateToLogin, onNavigateToRegister, preview }: StationDetailProps) {
  const [showGeorgi, setShowGeorgi] = useState(true);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isCompleted = preview ? preview.state === 'completed' : station.status === 'completed';
  const theme = stationThemeProps(station.color);

  // Proximity check - only for stations with AR routes
  const RADIUS_METERS = 100;
  const arRoute = STATION_AR_ROUTES[station.id] ?? station.arRoute;
  const hasARRoute = !!arRoute || !!preview;
  // Gleiche Login-Regeln für alle Stationen (AR und Stationsverwaltung): ohne Login erst Login-Karte,
  // als Gast darf man die Station erleben, schließt sie aber nicht ab (wie der AR-Abschlussbutton)
  const needsLogin = preview ? preview.state === 'needs_login' : requireLoginForAR && isLoggedIn === false;
  // Stationen aus der Stationsverwaltung ohne AR-Rundumblick sind kein „AR-Erlebnis“
  const isModuleStation = station.arRoute !== undefined && !station.hasArModule;
  const proximity = useStationProximity(station.latitude, station.longitude, RADIUS_METERS, { enabled: !preview });
  const locationError = proximity.locationError;
  const isWithinRadius = preview ? preview.state === 'in_range' || preview.state === 'completed' : proximity.isWithinRadius;
  const distance = preview
    ? preview.state === 'too_far'
      ? PREVIEW_DISTANCE_TOO_FAR
      : preview.state === 'in_range'
        ? PREVIEW_DISTANCE_IN_RANGE
        : null
    : proximity.distance;

  const handleNavigateToStation = () => {
    if (preview) return;
    // Open Google Maps with directions to the station
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    window.open(mapsUrl, '_blank');
  };

  const handleStartARExperience = () => {
    if (preview) {
      preview.onStart();
      return;
    }
    // Navigate to AR view - proximity check happens there
    if (arRoute) {
      // XR availability decides between the XR and non-XR Klosterweiher experience
      const xrAvailable = 'xr' in navigator;
      navigate(arRoute, {
        state: allowGuestARStart ? { allowGuestStart: true, xrAvailable } : { xrAvailable },
      });
    } else {
      // Fallback: Mark as completed if no AR route
      onComplete(station.id);
    }
  };

  const navigateLabel = t('navigateToStation', { stationName: station.title });

  return (
    <motion.div
      className={`fixed inset-0 bg-background z-50 overflow-y-auto overscroll-contain${theme.className ? ` ${theme.className}` : ''}`}
      style={theme.style}
      initial={preview ? false : { y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 34, stiffness: 320 }}
    >
      {/* Hero */}
      <div className="relative h-[clamp(260px,calc(var(--app-dvh,1dvh)*42),380px)] overflow-hidden">
        {station.imageUrl ? (
          <ImageWithFallback
            src={station.imageUrl}
            alt={station.title}
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 brand-gradient">
            <div className="topo-texture absolute inset-0" />
          </div>
        )}
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
              initial={preview ? false : { opacity: 0, y: 12 }}
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
              initial={preview ? false : { opacity: 0, y: 12 }}
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
              initial={preview ? false : { opacity: 0, y: 12 }}
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
              initial={preview ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="topo-texture absolute inset-0" aria-hidden="true" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1.5 rounded-full mb-4">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">{t('withinRange', { distance: Math.round(distance!) })}</span>
                </div>
                <h3 className="font-bold text-xl">{t(isModuleStation ? 'stationPlayerReady' : 'arExperienceAvailable')}</h3>
                <p className="text-sm text-white/85 mt-1.5 mb-6 leading-relaxed">
                  {t(isModuleStation ? 'stationPlayerReadyDescription' : 'closeEnoughDescription')}
                </p>
                <div className="space-y-2.5">
                  <button
                    onClick={handleStartARExperience}
                    className="w-full min-h-[56px] bg-white text-primary rounded-2xl font-extrabold flex items-center justify-center gap-2 shadow-lg pressable"
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    <span>{t(isModuleStation ? 'stationPlayerStart' : 'startARExperience')}</span>
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

      <GuestWarningDialog
        open={showGuestWarning}
        onCancel={() => setShowGuestWarning(false)}
        onContinue={() => {
          setShowGuestWarning(false);
          onEnableGuestStart?.();
          // Proximity prüft die Route selbst
          if (hasARRoute) handleStartARExperience();
        }}
      />
    </motion.div>
  );
}