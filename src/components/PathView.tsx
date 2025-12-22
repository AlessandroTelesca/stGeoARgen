import { ArrowLeft, Navigation as NavigationIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { StationCard } from './StationCard';
import { ProgressBar } from './ProgressBar';

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

export function PathView({
  pathTitle,
  pathDescription,
  stations,
  onStationClick,
  onBack,
  userProgress,
}: PathViewProps) {
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
            <span className="font-medium">Zurück</span>
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
            <h4 className="font-semibold text-sm mb-1">Freie Stationswahl</h4>
            <p className="text-sm text-muted-foreground">
              Du kannst die Stationen in beliebiger Reihenfolge besuchen. Starte wo du möchtest!
            </p>
          </div>
        </motion.div>

        {/* Stations Grid */}
        <div>
          <h3 className="font-semibold mb-4">Alle Stationen ({stations.length})</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stations.map((station, index) => (
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
        </div>
      </div>
    </div>
  );
}
