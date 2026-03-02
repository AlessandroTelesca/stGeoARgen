import { useRef, useState, useEffect, RefObject } from 'react';
import { ARTopBar } from './ARTopBar';
import { ARProgressBar } from './ARProgressBar';
import { ARProfileMenu } from './ARProfileMenu';
import { ARStationCompletionDialog } from './ARStationCompletionDialog';
import { STATIONS_COORDINATES } from '../../data/stationsConfig';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import './ARComponents.css';

interface ARComponentBaseProps {
  onNavigateHome?: () => void;
  closeARViewKey?: string;
  containerRef: RefObject<HTMLDivElement>;
  videoRef: RefObject<HTMLVideoElement>;
  overlayRootRef?: RefObject<HTMLDivElement | null>;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
  onRegister?: () => void;
  /** Abgeschlossene Stationen (aus App.tsx paths) */
  completedStations?: number;
  /** Gesamtanzahl der Stationen (aus App.tsx paths) */
  totalStations?: number;
  /** Gesammelte Punkte */
  totalPoints?: number;
  /** Aktuelle Station ID (für Abschluss-Callback) */
  currentStationId?: number;
  /** Titel der aktuellen Station */
  currentStationTitle?: string;
  /** Punkte der aktuellen Station */
  currentStationPoints?: number;
  /** Callback wenn User Station abschließt */
  onCompleteStation?: (stationId: number) => void;
}

// Export Stations aus zentraler Config
export const STATIONS = STATIONS_COORDINATES;

// Globales Flag zum kompletten Abschalten von Geolocation
const DISABLE_GEO = true;
const MOCK_LOCATION = { lat: 48.0, lng: 11.0 };

// Haversine-Formel zur Berechnung der Distanz zwischen zwei Koordinaten
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Erdradius in Metern
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distanz in Metern
};

// Custom Hook für Station Proximity Check (50m Radius)
export const useStationProximity = (stationLat: number, stationLng: number, radiusMeters: number = 50) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (DISABLE_GEO) {
      setUserLocation(MOCK_LOCATION);
      setDistance(0);
      setLocationError(null);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation wird von deinem Browser nicht unterstützt.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        // Calculate distance to station
        const dist = calculateDistance(userLat, userLng, stationLat, stationLng);
        setDistance(dist);
        setLocationError(null);

        console.log(`[Proximity] Distanz zur Station: ${Math.round(dist)}m (Genauigkeit: ±${Math.round(position.coords.accuracy)}m)`);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError('Standortzugriff verweigert. Bitte erlaube den Standortzugriff in den Einstellungen.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Alle 5 Sekunden neue Position anfordern
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [stationLat, stationLng]);

  const isWithinRadius = distance !== null && distance <= radiusMeters;

  return { userLocation, distance, locationError, isWithinRadius };
};

export const ARComponentBase = ({
  onNavigateHome,
  closeARViewKey = 'closeARView',
  containerRef,
  videoRef,
  overlayRootRef,
  username,
  onLogin,
  onLogout,
  onNavigateProfile,
  onRegister,
  completedStations = 0,
  totalStations = 0,
  totalPoints = 0,
  currentStationId,
  currentStationTitle = 'Station',
  currentStationPoints = 0,
  onCompleteStation,
}: ARComponentBaseProps) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestStation, setNearestStation] = useState<typeof STATIONS[0] | null>(null);
  const [distanceToNext, setDistanceToNext] = useState<number | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [stationStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Snapshot: gespeicherter Wert beim Klick auf "Station abschließen" (VOR props-Update)
  const [remainingAtCompletion, setRemainingAtCompletion] = useState(0);

  // Echter Progress aus Props
  const progress = {
    current: completedStations + 1 > totalStations ? totalStations : completedStations + 1,
    total: totalStations || 1,
    points: totalPoints,
  };

  // Station status: completed, current, locked
  const stations = Array.from({ length: Math.max(progress.total, 1) }, (_, i) => {
    if (i < completedStations) return 'completed';
    if (i === completedStations && completedStations < progress.total) return 'current';
    return 'locked';
  });

  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else if ((window as any)[closeARViewKey]) {
      (window as any)[closeARViewKey]();
    }
  };

  // Get user location and calculate nearest station
  useEffect(() => {
    // Filter out completed stations (all stations before current)
    const incompleteStations = STATIONS.filter((station, index) => index >= progress.current - 1);

    if (incompleteStations.length === 0) {
      console.log('Alle Stationen abgeschlossen!');
      setNearestStation(STATIONS[STATIONS.length - 1]); // Fallback zur letzten Station
      setDistanceToNext(null);
      return;
    }

    if (DISABLE_GEO) {
      setUserLocation(MOCK_LOCATION);
      // In Mock-Mode nächste Station wählen (nicht die aktuelle)
      const nextStation = incompleteStations.length > 1 ? incompleteStations[1] : incompleteStations[0];
      setNearestStation(nextStation);
      setDistanceToNext(350); // Mock-Distanz für Demo
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setUserLocation({ lat: userLat, lng: userLng });

          // Finde nächste NICHT-ABGESCHLOSSENE Station (die auf die aktuelle folgt)
          const nextStations = incompleteStations.slice(1); // Überspringe aktuelle
          if (nextStations.length === 0) {
            setDistanceToNext(null);
            setNearestStation(null);
            return;
          }

          let minDistance = Infinity;
          let nearest = nextStations[0];
          nextStations.forEach((station) => {
            const distance = calculateDistance(userLat, userLng, station.lat, station.lng);
            if (distance < minDistance) {
              minDistance = distance;
              nearest = station;
            }
          });

          setNearestStation(nearest);
          setDistanceToNext(minDistance);
          console.log(`Nächste Station: ${nearest.name} (${Math.round(minDistance)}m entfernt)`);
        },
        (error) => {
          console.error('Geolocation error:', error);
          const nextStation = incompleteStations.length > 1 ? incompleteStations[1] : null;
          setNearestStation(nextStation);
          setDistanceToNext(null);
        }
      );
    } else {
      console.error('Geolocation wird nicht unterstützt');
      const nextStation = incompleteStations.length > 1 ? incompleteStations[1] : null;
      setNearestStation(nextStation);
      setDistanceToNext(null);
    }
  }, [progress.current]);

  // Timer läuft wenn Dialog offen ist (zeigt Aufenthaltsdauer)
  useEffect(() => {
    if (!showCompletionDialog) return;
    const elapsed = Math.floor((Date.now() - stationStartTime) / 1000);
    setElapsedSeconds(elapsed);
  }, [showCompletionDialog, stationStartTime]);

  // "Station abschließen" clicked → Progress speichern + Dialog zeigen
  const handleCompleteStation = () => {
    // Snapshot BEFORE calling onCompleteStation (which may update completedStations prop)
    const remaining = Math.max(0, (totalStations || 1) - completedStations - 1);
    setRemainingAtCompletion(remaining);
    if (currentStationId && onCompleteStation) {
      onCompleteStation(currentStationId);
    }
    setShowCompletionDialog(true);
  };

  const handleNavigateToNextStation = () => {
    setShowCompletionDialog(false);
    if (!nearestStation) {
      console.error('Keine nächste Station gefunden');
      return;
    }

    const nextStationLat = nearestStation.lat;
    const nextStationLng = nearestStation.lng;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      window.location.href = `maps://maps.apple.com/?daddr=${nextStationLat},${nextStationLng}&dirflg=w`;
    } else if (isAndroid) {
      window.location.href = `google.navigation:q=${nextStationLat},${nextStationLng}&mode=w`;
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${nextStationLat},${nextStationLng}&travelmode=walking`, '_blank');
    }
  };

  const remainingStations = Math.max(0, (totalStations || 1) - (completedStations + 1));

  return (
    <div className="ar-container" ref={overlayRootRef}>
      {/* Video-Hintergrund für Kamera-Stream */}
      <video
        ref={videoRef}
        className="ar-video"
        playsInline
        muted
      />

      {/* AR Container für Three.js */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          zIndex: 5,
          pointerEvents: 'none'
        }}
      />

      {/* UI Overlay */}
      <div className="ar-ui-overlay">
        <ARTopBar
          onNavigateHome={handleNavigateHome}
          onProfileClick={() => setProfileMenuOpen(!profileMenuOpen)}
          profileMenuOpen={profileMenuOpen}
          username={username || null}
        />

        <ARProgressBar progress={progress} stations={stations} />

        {/* "Station abschließen"-Button */}
        <motion.button
          onClick={handleCompleteStation}
          className="ar-navigate-button"
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="ar-navigate-button-content">
            <CheckCircle2 style={{ width: '22px', height: '22px', color: 'white', flexShrink: 0 }} />
            <span className="ar-navigate-button-text">Station abschließen</span>
          </div>
        </motion.button>

        <ARProfileMenu
          isOpen={profileMenuOpen}
          onClose={() => setProfileMenuOpen(false)}
          username={username || null}
          onLogin={() => {
            onLogin?.();
            setProfileMenuOpen(false);
          }}
          onLogout={() => {
            onLogout?.();
            setProfileMenuOpen(false);
          }}
          onNavigateProfile={onNavigateProfile}
          onRegister={() => {
            onRegister?.();
            setProfileMenuOpen(false);
          }}
        />
      </div>

      {/* Completion Dialog */}
      <ARStationCompletionDialog
        isOpen={showCompletionDialog}
        stationTitle={currentStationTitle}
        stationPoints={currentStationPoints}
        durationSeconds={elapsedSeconds}
        remainingStations={remainingAtCompletion}
        totalStations={totalStations || 1}
        distanceToNextStation={distanceToNext}
        onNavigateHome={() => {
          setShowCompletionDialog(false);
          handleNavigateHome();
        }}
        onNavigateToNextStation={handleNavigateToNextStation}
      />
    </div>
  );
};
