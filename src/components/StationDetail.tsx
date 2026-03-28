import React from 'react';
import { X, CheckCircle2, Navigation, Play, AlertCircle, Lock, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Georgi } from './Georgi';
import { Trophy } from 'lucide-react';
import { MapPin, Clock, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStationProximity } from './ARComponents/ARComponentBase';
import { useLanguage } from '../contexts/LanguageContext';

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
  };
  onClose: () => void;
  onComplete: (stationId: number) => void;
  isLoggedIn?: boolean;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
}

// Station ID to AR Route mapping
const STATION_AR_ROUTES: Record<number, string> = {
  1: '/glockenspiel',    // Historisches Rathaus
  3: '/phonomuseum',     // Heimatmuseum
  5: '/klosterweiher',   // Aussichtspunkt Hörnle
};

export function StationDetail({ station, onClose, onComplete, isLoggedIn, onNavigateToLogin, onNavigateToRegister }: StationDetailProps) {
  const [showGeorgi, setShowGeorgi] = useState(true);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isCompleted = station.status === 'completed';

  // Proximity check - only for stations with AR routes
  const RADIUS_METERS = 100;
  const hasARRoute = !!STATION_AR_ROUTES[station.id];
  const needsLogin = isLoggedIn === false && hasARRoute;
  const { distance, isWithinRadius, locationError } = useStationProximity(
    station.latitude,
    station.longitude,
    RADIUS_METERS
  );

  // Log access status
  React.useEffect(() => {
    if (hasARRoute && distance !== null) {
      if (isWithinRadius) {
        console.log(`[StationDetail] Access granted - Station ${station.id} (${station.title}) within radius`);
      } else {
        console.log(`[StationDetail] Access denied - Station ${station.id} (${station.title}) ${Math.round(distance)}m away (requires ≤100m)`);
      }
    }
  }, [hasARRoute, distance, isWithinRadius, station.id, station.title]);

  const handleNavigateToStation = () => {
    // Open Google Maps with directions to the station
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    window.open(mapsUrl, '_blank');
  };

  const handleStartARExperience = () => {
    // Navigate to AR view - proximity check happens there
    const arRoute = STATION_AR_ROUTES[station.id];
    if (arRoute) {
      navigate(arRoute);
    } else {
      // Fallback: Mark as completed if no AR route
      onComplete(station.id);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-background z-50 overflow-y-auto"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-border p-4 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center hover:bg-muted/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
            <Trophy className="w-4 h-4" />
            <span className="font-semibold">{station.points} Punkte</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Hero Image */}
        <div className="relative h-64 rounded-2xl overflow-hidden mb-6">
          <ImageWithFallback
            src={station.imageUrl}
            alt={station.title}
            className="w-full h-full object-cover"
          />
          {isCompleted && (
            <div className="absolute top-4 right-4 bg-black text-white rounded-full p-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <h1 className="mb-2">{station.title}</h1>
            <p className="text-muted-foreground">
              {station.longDescription}
            </p>
          </div>

          {/* LOGIN GATE – shown when not logged in and AR is available */}
          {needsLogin && (
            <motion.div
              className="bg-white text-gray-900 rounded-2xl p-6 text-center shadow-xl border border-gray-100"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-20 h-20 bg-primary/10 border-2 border-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-lg text-gray-900">{t('loginRequired')}</h3>
              <p className="text-sm text-gray-500 mb-6">
                {t('loginToStartAR')}
              </p>
              <div className="space-y-3">
                <button
                  onClick={onNavigateToLogin}
                  className="w-full bg-primary text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <LogIn className="w-5 h-5" />
                  <span>{t('loginNow')}</span>
                </button>
                {onNavigateToRegister && (
                  <button
                    onClick={onNavigateToRegister}
                    className="w-full bg-white text-primary border-2 border-primary py-3 rounded-xl font-semibold active:scale-[0.98] transition-transform"
                  >
                    {t('createAccount')}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Location Error */}
          {!needsLogin && hasARRoute && locationError && !isCompleted && (
            <motion.div
              className="bg-warning/10 border border-warning/30 rounded-2xl p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
                <div className="w-full">
                  <h3 className="font-semibold mb-1 text-warning">{t('locationAccessRequired')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {locationError}
                  </p>
                  <button
                    onClick={handleNavigateToStation}
                    className="w-full bg-primary text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <Navigation className="w-5 h-5" />
                    <span>{t('navigateToStation', { stationName: station.title })}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Distance Check - Too Far (Echtzeit-Anzeige) */}
          {!needsLogin && hasARRoute && !locationError && distance !== null && !isWithinRadius && !isCompleted && (
            <motion.div
              className="bg-black text-white rounded-2xl p-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={Math.round(distance)} // Re-animate on distance change
            >
              <div className="w-20 h-20 bg-warning/20 border-2 border-warning rounded-full mx-auto mb-4 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-warning" />
              </div>
              <h3 className="font-semibold mb-2">{t('tooFarAway')}</h3>
              <div className="inline-block bg-warning/20 text-warning px-4 py-2 rounded-lg mb-4">
                <p className="text-2xl font-bold">{Math.round(distance)}m</p>
                <p className="text-xs opacity-75">{t('estimatedDistance')}</p>
              </div>
              <p className="text-sm opacity-75 mb-6">
                {t('getCloserDistance')}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleNavigateToStation}
                  className="w-full bg-white text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Navigation className="w-5 h-5" />
                  <span>{t('navigateToStation', { stationName: station.title })}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* AR Experience Button - Within Radius */}
          {!needsLogin && hasARRoute && !locationError && isWithinRadius && !isCompleted && (
            <motion.div
              className="bg-primary text-white rounded-2xl p-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-20 h-20 bg-white/20 border-2 border-white rounded-full mx-auto mb-4 flex items-center justify-center">
                <Play className="w-10 h-10 text-white" />
              </div>
              <div className="inline-flex items-center gap-2 bg-white/20 text-white px-3 py-1.5 rounded-lg mb-3">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-semibold">{t('withinRange', { distance: Math.round(distance!) })}</span>
              </div>
              <h3 className="font-semibold mb-2">{t('arExperienceAvailable')}</h3>
              <p className="text-sm opacity-90 mb-6">
                {t('closeEnoughDescription')}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleStartARExperience}
                  className="w-full bg-white text-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  <span>{t('startARExperience')}</span>
                </button>
                <button
                  onClick={handleNavigateToStation}
                  className="w-full bg-white/20 text-white border-2 border-white/30 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Navigation className="w-5 h-5" />
                  <span>{t('navigateToStation', { stationName: station.title })}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* No AR available - fallback */}
          {!isCompleted && !STATION_AR_ROUTES[station.id] && (
            <motion.div
              className="bg-muted rounded-2xl p-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <h3 className="font-semibold mb-2">{t('informationStation')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('noARExperience')}
              </p>
              <button
                onClick={handleNavigateToStation}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Navigation className="w-5 h-5" />
                <span>{t('navigateToStation', { stationName: station.title })}</span>
              </button>
            </motion.div>
          )}

          {/* Completed State */}
          {isCompleted && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">{t('stationCompleted')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('stationCompletedReplay')}
              </p>
              <button
                onClick={handleStartARExperience}
                className="w-full bg-white text-primary border border-primary/30 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Play className="w-5 h-5" />
                <span>{t('repeatStation')}</span>
              </button>
            </div>
          )}

          {/* Additional Info */}
          <div className="bg-white border border-border rounded-2xl p-4">
            <h4 className="font-semibold mb-3">{t('stationFunFacts')}</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{t('stationLocation')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{t('stationEstimatedDuration')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>{t('stationDifficulty')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Georgi Helper */}
      <Georgi
        message={
          needsLogin
            ? "Melde dich an, um das AR-Erlebnis freizuschalten!"
            : hasARRoute && isWithinRadius && !locationError
            ? "Super! Du bist nah genug. Starte das AR-Erlebnis!"
            : hasARRoute && distance !== null
            ? `Du bist noch ${Math.round(distance)}m entfernt. Nutze die Navigation!`
            : "Besuche diese Station vor Ort für mehr Informationen!"
        }
        show={showGeorgi && !isCompleted}
        onClose={() => setShowGeorgi(false)}
        position="bottom-right"
      />
    </motion.div>
  );
}