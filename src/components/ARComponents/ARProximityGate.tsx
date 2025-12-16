import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Navigation, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { useStationProximity, STATIONS, calculateDistance } from './ARComponentBase';
import { getStationCoordinates, STATIONS_COORDINATES } from '../../data/stationsConfig';

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
  const [allowAccess, setAllowAccess] = useState(false);
  const [nearestStation, setNearestStation] = useState<{ id: number; name: string; distance: number } | null>(null);
  
  // Get coordinates from central config
  const stationCoords = getStationCoordinates(stationId);
  
  const RADIUS_METERS = 10000000; //!!!!! meters set to 100000 for testing !!!!!! Should be 100 in production
  const { distance, isWithinRadius, locationError, userLocation } = useStationProximity(
    stationCoords?.lat || 0,
    stationCoords?.lng || 0,
    RADIUS_METERS
  );

  // Allow access once user is within radius
  useEffect(() => {
    if (isWithinRadius) {
      console.log('[ARProximityGate] ✅ Access granted - user within radius');
      setAllowAccess(true);
      onAccessGranted?.();
    } else if (distance !== null && !isWithinRadius) {
      console.log(`[ARProximityGate] ❌ Access denied - user ${Math.round(distance)}m away (requires ≤100m)`);
    }
  }, [isWithinRadius, distance, onAccessGranted]);

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

  // Show proximity check UI
  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-border p-4 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={onNavigateBack}
            className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center hover:bg-muted/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-lg">{stationName}</h2>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-24 flex items-center justify-center min-h-[80vh]">
        {/* Location Error */}
        {locationError && (
          <motion.div
            className="bg-warning/10 border border-warning/30 rounded-2xl p-6 w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1 text-warning">Standortzugriff erforderlich</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {locationError}
                </p>
                <button
                  onClick={handleNavigateToStation}
                  className="w-full bg-primary text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Navigation className="w-5 h-5" />
                  <span>Zur Station navigieren</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Distance Check - Too Far */}
        {!locationError && distance !== null && !isWithinRadius && (
          <motion.div
            className="w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-red-500/20 border-4 border-red-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
            </div>
            
            {/* Main Message */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl text-center space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Zugriff verweigert</h2>
                <p className="text-gray-600">Station außerhalb der Reichweite</p>
              </div>

              {/* Distance Display */}
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <p className="text-5xl font-black text-red-600 mb-1">{Math.round(distance)}m</p>
                <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">Zu weit entfernt</p>
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-xs text-gray-600">Erforderlich: ≤ 100m</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 leading-relaxed">
                Du musst dich innerhalb von <span className="font-semibold text-gray-900">100 Metern</span> der Station befinden, um das AR-Erlebnis freizuschalten.
              </p>
              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={handleNavigateToStation}
                  className="w-full bg-primary text-primary-foreground px-6 py-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-primary-dark active:scale-[0.98] transition-all shadow-lg"
                >
                  <Navigation className="w-6 h-6 flex-shrink-0" />
                  <span>Zu {stationName} navigieren</span>
                </button>
                
                <button
                  onClick={handleGoToApp}
                  className="w-full bg-muted text-muted-foreground px-6 py-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-muted/70 active:scale-[0.98] transition-all shadow-lg"
                >
                  <Home className="w-6 h-6 flex-shrink-0" />
                  <span>Zurück zur Startseite</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading state while checking proximity */}
        {!locationError && distance === null && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Standort wird ermittelt...</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
