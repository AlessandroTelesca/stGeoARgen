import { useRef, useState, useEffect, RefObject } from 'react';
import { GeorgiAvatar } from '../Georgi';
import { ARTopBar } from './ARTopBar';
import { ARProgressBar } from './ARProgressBar';
import { ARNavigationButton } from './ARNavigationButton';
import { ARProfileMenu } from './ARProfileMenu';
import './ARComponents.css';

interface ARComponentBaseProps {
  onNavigateHome?: () => void;
  closeARViewKey?: string; // Key for window.closeXXXView function
  containerRef: RefObject<HTMLDivElement>;
  videoRef: RefObject<HTMLVideoElement>;
  overlayRootRef?: RefObject<HTMLDivElement | null>;
}

// Dummy Stationen in St. Georgen im Schwarzwald, Richtige Koordinaten noch einfügen!
const STATIONS = [
  { id: 1, name: 'Rathaus', lat: 48.1246, lng: 8.3341 },
  { id: 2, name: 'Stadtkirche', lat: 48.1251, lng: 8.3355 },
  { id: 3, name: 'Marktplatz', lat: 48.1248, lng: 8.3347 },
  { id: 4, name: 'Phonomuseum', lat: 48.1243, lng: 8.3338 },
  { id: 5, name: 'Klosterweiher', lat: 48.1239, lng: 8.3352 },
];

// Haversine-Formel zur Berechnung der Distanz zwischen zwei Koordinaten
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

export const ARComponentBase = ({ onNavigateHome, closeARViewKey = 'closeARView', containerRef, videoRef, overlayRootRef }: ARComponentBaseProps) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [progress, setProgress] = useState({ current: 2, total: 5, points: 150 }); // Mock data - 5 Stationen
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestStation, setNearestStation] = useState<typeof STATIONS[0] | null>(null);
  
  // Station status: completed, current, locked
  const stations = Array.from({ length: progress.total }, (_, i) => {
    if (i < progress.current - 1) return 'completed';
    if (i === progress.current - 1) return 'current';
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setUserLocation({ lat: userLat, lng: userLng });

          // Finde nächste Station
          let minDistance = Infinity;
          let nearest = STATIONS[0];

          STATIONS.forEach((station) => {
            const distance = calculateDistance(userLat, userLng, station.lat, station.lng);
            if (distance < minDistance) {
              minDistance = distance;
              nearest = station;
            }
          });

          setNearestStation(nearest);
          console.log(`Nächste Station: ${nearest.name} (${Math.round(minDistance)}m entfernt)`);
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Fallback: erste Station als nächste Station
          setNearestStation(STATIONS[0]);
        }
      );
    } else {
      console.error('Geolocation wird nicht unterstützt');
      // Fallback: erste Station als nächste Station
      setNearestStation(STATIONS[0]);
    }
  }, []);

  const handleNavigateToNextStation = () => {
    if (!nearestStation) {
      console.error('Keine Station gefunden');
      return;
    }

    const nextStationLat = nearestStation.lat;
    const nextStationLng = nearestStation.lng;
    
    // Detect device and open appropriate maps app
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      // Open Apple Maps
      window.location.href = `maps://maps.apple.com/?daddr=${nextStationLat},${nextStationLng}&dirflg=w`;
    } else if (isAndroid) {
      // Open Google Maps
      window.location.href = `google.navigation:q=${nextStationLat},${nextStationLng}&mode=w`;
    } else {
      // Fallback to Google Maps in browser
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${nextStationLat},${nextStationLng}&travelmode=walking`, '_blank');
    }
  };

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
        />

        <ARProgressBar progress={progress} stations={stations} />

        <ARNavigationButton onNavigateToNextStation={handleNavigateToNextStation} />

        <ARProfileMenu
          isOpen={profileMenuOpen}
          onClose={() => setProfileMenuOpen(false)}
          onProfileClick={() => {
            // TODO: Handle profile click
          }}
          onSettingsClick={() => {
            // TODO: Handle settings click
          }}
          onLogoutClick={() => {
            // TODO: Handle logout click
          }}
        />
      </div>
    </div>
  );
};
