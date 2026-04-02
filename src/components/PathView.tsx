import { ArrowLeft, Navigation as NavigationIcon, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { StationCard } from './StationCard';
import { ProgressBar } from './ProgressBar';
import { Input } from './ui/input';

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
    <div className="min-h-screen bg-background pb-8">
      {/* Back Button */}
      <div className="sticky top-16 bg-background/80 backdrop-blur-sm z-20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{t('back')}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Path Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold mb-2">{pathTitle}</h2>
          <p className="text-muted-foreground mb-6">{pathDescription}</p>

          <ProgressBar
            current={userProgress.completedStations}
            total={userProgress.totalStations}
            points={userProgress.points}
          />
        </motion.div>

        {/* Info Banner */}
        <motion.div
          className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <NavigationIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm mb-1">{t('freeStationChoice')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('freeStationChoiceDesc')}
            </p>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          className="mb-6 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('searchStation')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </motion.div>

        {/* Stations Grid */}
        <div>
          <h3 className="font-semibold mb-4">
            {searchQuery
              ? `${t('foundStations')} (${processedStations.length})`
              : `${t('allStations')} (${stations.length})`}
          </h3>
          {processedStations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('noStationsFound')}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedStations.map((station, index) => (
                <motion.div
                  key={station.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
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
