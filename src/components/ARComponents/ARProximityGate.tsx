import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Navigation, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { useStationProximity, STATIONS, calculateDistance } from './ARComponentBase';
import { getStationCoordinates, STATIONS_COORDINATES } from '../../data/stationsConfig';
import { useLanguage } from '../../contexts/LanguageContext';

interface ARProximityGateProps {
  stationId: number;
  stationName: string;
  children: React.ReactNode;
  onNavigateBack?: () => void;
  onAccessGranted?: () => void;
}

/**
 * Proximity Gate für AR-Views
 * Prüft ob Nutzer innerhalb 100m der Station ist, bevor AR-Erlebnis gestartet wird
 */
export const ARProximityGate = ({ stationId, stationName, children, onNavigateBack, onAccessGranted }: ARProximityGateProps) => {
  const { t } = useLanguage();
  const [allowAccess, setAllowAccess] = useState(false);
  const [nearestStation, setNearestStation] = useState<{ id: number; name: string; distance: number } | null>(null);
  
  // Get coordinates from central config
  const stationCoords = getStationCoordinates(stationId);
  
  const RADIUS_METERS = 100;
  const { distance, isWithinRadius, locationError, userLocation } = useStationProximity(
    stationCoords?.lat || 0,
    stationCoords?.lng || 0,
    RADIUS_METERS
  );

  // Allow access once user is within radius
  useEffect(() => {
    if (isWithinRadius && !allowAccess) {
      console.log('[ARProximityGate] Access granted - user within radius');
      setAllowAccess(true);
      onAccessGranted?.();
    } else if (distance !== null && !isWithinRadius) {
      console.log(`[ARProximityGate] Access denied - user ${Math.round(distance)}m away (requires ≤100m)`);
    }
  }, [isWithinRadius, distance, allowAccess, onAccessGranted]);

  // Find nearest station when too far
  useEffect(() => {
    if (userLocation && distance !== null && !isWithinRadius) {
      let minDist = Infinity;
      let nearest = STATIONS_COORDINATES[0];

      STATIONS_COORDINATES.forEach((station) => {
        const dist = calculateDistance(userLocation.lat, userLocation.lng, station.lat, station.lng);
        if (dist < minDist) {
          minDist = dist;
          nearest = station;
        }
      });

      setNearestStation({
        id: nearest.id,
        name: nearest.name,
        distance: minDist,
      });
    }
  }, [userLocation, distance, isWithinRadius]);

  const handleNavigateToStation = () => {
    if (!stationCoords) return;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${stationCoords.lat},${stationCoords.lng}`;
    window.open(mapsUrl, '_blank');
  };

  const handleNavigateToNearestStation = () => {
    if (!nearestStation) return;
    const coords = getStationCoordinates(nearestStation.id);
    if (!coords) return;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
    window.open(mapsUrl, '_blank');
  };

  const handleGoToApp = () => {
    // Navigate back to app home
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.location.href = '/';
    }
  };

  // Show AR experience if access granted
  if (allowAccess) {
    return <>{children}</>;
  }

  const formattedDistance = distance === null
    ? ''
    : distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`;

  // Show proximity check UI
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 text-white">
      <div className="topo-texture pointer-events-none fixed inset-0 opacity-70" aria-hidden="true" />

      <div className="relative flex items-center gap-3 px-4" style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}>
        <button
          onClick={onNavigateBack}
          aria-label={t('back')}
          className="ar-glass w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 pressable"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-lg truncate">{stationName}</h2>
      </div>

      <div className="relative max-w-md mx-auto px-5 pt-8 flex flex-col justify-center min-h-[80dvh]" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom, 0px))' }}>
        {/* Standortfehler */}
        {locationError && (
          <motion.div
            className="rounded-[28px] bg-card text-foreground p-6 shadow-2xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="w-12 h-12 rounded-2xl bg-gold-soft text-gold flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </span>
            <h3 className="text-xl font-bold">{t('locationAccessRequired')}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 mb-6 leading-relaxed">{locationError}</p>
            <button
              onClick={handleNavigateToStation}
              className="w-full min-h-[54px] bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors pressable"
            >
              <Navigation className="w-5 h-5" />
              <span>{t('navigateToStation', { stationName })}</span>
            </button>
          </motion.div>
        )}

        {/* Zu weit entfernt */}
        {!locationError && distance !== null && !isWithinRadius && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="relative mx-auto mb-6 flex w-24 h-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-gold/25 animate-ping" style={{ animationDuration: '2.4s' }} aria-hidden="true" />
              <span className="relative w-24 h-24 rounded-full bg-gold/15 border-2 border-gold flex items-center justify-center">
                <MapPin className="w-10 h-10 text-gold-bright" />
              </span>
            </span>

            <h2 className="text-[26px] font-extrabold tracking-tight">{t('accessDenied')}</h2>
            <p className="text-white/75 mt-1.5">{t('stationOutOfRange')}</p>

            <div className="ar-glass mt-6 rounded-[24px] p-5">
              <p className="text-5xl font-extrabold tabular-nums text-gold-bright">{formattedDistance}</p>
              <p className="mt-1 text-sm font-semibold text-white/80">{t('tooFarAway')}</p>
              <p className="mt-3 pt-3 border-t border-white/10 text-xs text-white/60">{t('requiredDistance')}</p>
            </div>

            <p className="text-sm text-white/70 leading-relaxed mt-5 mb-6">{t('approachStation')}</p>

            <div className="space-y-2.5">
              <button
                onClick={handleNavigateToStation}
                className="w-full min-h-[56px] bg-white text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors pressable"
              >
                <Navigation className="w-5 h-5 flex-shrink-0" />
                <span>{t('navigateToStation', { stationName })}</span>
              </button>
              <button
                onClick={handleGoToApp}
                className="w-full min-h-[52px] rounded-2xl font-semibold border border-white/20 bg-white/10 hover:bg-white/15 flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-5 h-5 flex-shrink-0" />
                <span>{t('backToHome')}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Standort wird ermittelt */}
        {!locationError && distance === null && (
          <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className="block w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/75">{t('determiningLocation')}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
