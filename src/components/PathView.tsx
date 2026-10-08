import { Navigation as NavigationIcon, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { StationCard } from './StationCard';
import { ProgressBar } from './ProgressBar';
import { Input } from './ui/input';
import { BackLink } from './PageHeader';

interface Station {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  status: 'locked' | 'available' | 'completed';
  points: number;
  latitude: number;
  longitude: number;
}

interface PathViewProps {
  pathId: string;
  pathTitle: string;
  pathDescription: string;
  stations: Station[];
  onStationClick: (stationId: number) => void;
  onBack: () => void;
  userProgress: {
    completedStations: number;
    totalStations: number;
    points: number;
  };
}

// Haversine-Formel zur Entfernungsberechnung
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Erdradius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function PathView({
  pathTitle,
  pathDescription,
  stations,
  onStationClick,
  onBack,
  userProgress,
}: PathViewProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Standort des Benutzers ermitteln
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Standort konnte nicht ermittelt werden:', error);
        }
      );
    }
  }, []);

  // Stationen mit Entfernung anreichern und filtern/sortieren
  const processedStations = useMemo(() => {
    let result = stations.map(station => {
      const distance = userLocation
        ? calculateDistance(userLocation.lat, userLocation.lng, station.latitude, station.longitude)
        : null;
      return { ...station, distance };
    });

    // Suche anwenden
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(station => 
        station.title.toLowerCase().includes(query) ||
        station.description.toLowerCase().includes(query)
      );
    }

    // Sortierung immer nach Entfernung anwenden, wenn Standort verfügbar
    if (userLocation) {
      result.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    return result;
  }, [stations, searchQuery, userLocation]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-12">
        <BackLink onBack={onBack} />

        {/* Pfad-Kopf */}
        <motion.div
          className="mt-5 mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-[28px] leading-[1.15] font-extrabold tracking-tight">{pathTitle}</h2>
          <p className="text-muted-foreground mt-1.5 mb-5 leading-relaxed">{pathDescription}</p>

          <ProgressBar
            current={userProgress.completedStations}
            total={userProgress.totalStations}
            points={userProgress.points}
          />
        </motion.div>

        {/* Hinweis */}
        <motion.div
          className="rounded-2xl bg-primary-soft p-4 mb-5 flex items-start gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
        >
          <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0">
            <NavigationIcon className="w-4 h-4" />
          </span>
          <div>
            <h4 className="font-bold text-sm text-primary-dark">{t('freeStationChoice')}</h4>
            <p className="text-sm text-gray-700 leading-snug mt-0.5">
              {t('freeStationChoiceDesc')}
            </p>
          </div>
        </motion.div>

        {/* Suche */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder={t('searchStation')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl"
          />
        </div>

        {/* Stationen */}
        <div>
          <h3 className="text-lg font-bold tracking-tight mb-4">
            {searchQuery
              ? `${t('foundStations')} (${processedStations.length})`
              : `${t('allStations')} (${stations.length})`}
          </h3>
          {processedStations.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border-strong">
              <Search className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">{t('noStationsFound')}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {processedStations.map((station, index) => (
                <motion.div
                  key={station.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05, duration: 0.45 }}
                >
                  <StationCard
                    {...station}
                    latitude={station.latitude}
                    longitude={station.longitude}
                    onClick={() => onStationClick(station.id)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
