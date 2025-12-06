import { useRef, useState, useEffect, RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, User, Settings, Trophy, LogOut, Gift } from 'lucide-react';
import { GeorgiAvatar } from '../Georgi';
import './ARComponents.css';

interface ARComponentBaseProps {
  onNavigateHome?: () => void;
  closeARViewKey?: string; // Key for window.closeXXXView function
  containerRef: RefObject<HTMLDivElement>;
  videoRef: RefObject<HTMLVideoElement>;
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

export const ARComponentBase = ({ onNavigateHome, closeARViewKey = 'closeARView', containerRef, videoRef }: ARComponentBaseProps) => {
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
    <div className="ar-container">
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
          zIndex: 10,
          pointerEvents: 'none'
        }}
      />
      
      {/* UI Overlay */}
      <div className="ar-ui-overlay">
        {/* Top Bar - nur Home Button und Profil */}
        <div className="ar-top-bar">
          {/* Home Button */}
          <motion.button
            onClick={handleNavigateHome}
            className="ar-home-button"
            whileTap={{ scale: 0.95 }}
          >
            <Home style={{ width: '28px', height: '28px', color: '#0C690F' }} />
          </motion.button>

          {/* Profile Button */}
          <motion.button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="ar-profile-button"
            whileTap={{ scale: 0.98 }}
          >
            <GeorgiAvatar size="sm" />
            <div style={{ textAlign: 'left' }}>
              <div className="ar-profile-name">Max</div>
              <div className="ar-profile-email">Max@gmail.com</div>
            </div>
            <div className="ar-profile-points">123 👑</div>
            <motion.div
              animate={{ rotate: profileMenuOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </motion.div>
          </motion.button>
        </div>

        {/* Bottom Bar - Progress Stations */}
        <div className="ar-bottom-bar">
          <motion.div 
            className="ar-progress-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Stations Row */}
            <div className="ar-stations-row">
              {stations.map((status, index) => {
                const isLastStation = index === stations.length - 1;
                return (
                  <div key={index} className={`ar-station-wrapper ${index < stations.length - 1 ? 'ar-station-wrapper-flex' : ''}`}>
                    {/* Station Circle */}
                    <motion.div
                      className={`ar-station-circle ${
                        status === 'completed' ? 'ar-station-completed' :
                        status === 'current' ? 'ar-station-current' :
                        'ar-station-locked'
                      }`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                    >
                      {status === 'completed' && !isLastStation && (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                      {status === 'completed' && isLastStation && (
                        <Gift style={{ width: '22px', height: '22px', color: 'white' }} />
                      )}
                      {status === 'current' && (
                        <div className="ar-station-current-dot" />
                      )}
                      {status === 'locked' && !isLastStation && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      )}
                      {status === 'locked' && isLastStation && (
                        <Gift style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                      )}
                    </motion.div>
                    
                    {/* Connecting Line */}
                    {index < stations.length - 1 && (
                      <div className={`ar-station-line ${
                        index < progress.current - 1 ? 'ar-station-line-completed' : 'ar-station-line-locked'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Info Row */}
            <div className="ar-info-row">
              <span className="ar-station-text">
                Station {progress.current}/{progress.total}
              </span>
              <div className="ar-points-badge">
                <Trophy style={{ width: '16px', height: '16px' }} />
                <span className="ar-points-text">{progress.points} Punkte</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Navigation Button - Above Progress Bar Right */}
        <motion.button
          onClick={handleNavigateToNextStation}
          className="ar-navigate-button"
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="ar-navigate-button-content">
            <span className="material-icons" style={{ fontSize: '28px', color: 'white' }}>
              arrow_forward
            </span>
            <span className="ar-navigate-button-text">Zur nächsten Station</span>
          </div>
        </motion.button>

        {/* Profile Dropdown Menu */}
        <AnimatePresence>
          {profileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                className="ar-menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setProfileMenuOpen(false)}
              />

              {/* Menu Panel */}
              <motion.div
                className="ar-menu-panel"
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                {/* Menu Items */}
                <div className="ar-menu-items">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                    }}
                    className="ar-menu-item"
                  >
                    <div className="ar-menu-icon ar-menu-icon-primary">
                      <User style={{ width: '20px', height: '20px', color: '#0C690F' }} />
                    </div>
                    <span className="ar-menu-text">Profil</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                    }}
                    className="ar-menu-item"
                  >
                    <div className="ar-menu-icon ar-menu-icon-primary">
                      <Settings style={{ width: '20px', height: '20px', color: '#0C690F' }} />
                    </div>
                    <span className="ar-menu-text">Einstellungen</span>
                  </button>

                  <div className="ar-menu-divider" />

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                    }}
                    className="ar-menu-item ar-menu-item-logout"
                  >
                    <div className="ar-menu-icon ar-menu-icon-danger">
                      <LogOut style={{ width: '20px', height: '20px', color: '#dc2626' }} />
                    </div>
                    <span className="ar-menu-text-danger">Abmelden</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
