import { MapPin, CheckCircle2, Lock, Play, Filter, Search, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Badge } from './ui/badge';
import { useStationProximity } from './ARComponents/ARComponentBase';

interface Station {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  status: 'locked' | 'available' | 'completed';
  points: number;
  pathTitle: string;
  pathId: string;
  latitude: number;
  longitude: number;
}

interface StationsViewProps {
  paths: Array<{
    id: string;
    title: string;
    stations: Array<{
      id: number;
      title: string;
      description: string;
      imageUrl: string;
      status: 'locked' | 'available' | 'completed';
      points: number;
      latitude: number;
      longitude: number;
    }>;
  }>;
  onStationClick: (pathId: string, stationId: number) => void;
  onBack: () => void;
}

export function StationsView({ paths, onStationClick, onBack }: StationsViewProps) {
  const { t } = useLanguage();
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten all stations from all paths
  const allStations: Station[] = paths.flatMap(path =>
    path.stations.map(station => ({
      ...station,
      pathTitle: path.title,
      pathId: path.id,
      latitude: station.latitude,
      longitude: station.longitude,
    }))
  );

  // Apply filters
  const filteredStations = allStations.filter(station => {
    const matchesStatus = filterStatus === 'all' || station.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      station.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.pathTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalStations = allStations.length;
  const completedStations = allStations.filter(s => s.status === 'completed').length;
  const availableStations = allStations.filter(s => s.status === 'available').length;

  const getStatusIcon = (status: Station['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'available':
        return <Play className="w-5 h-5 text-primary" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: Station['status']) => {
    switch (status) {
      case 'completed':
        return 'border-success/30 bg-success/5';
      case 'available':
        return 'border-primary/30 bg-white';
      case 'locked':
        return 'border-border bg-muted/30 opacity-60';
    }
  };

  // Station Item Component with distance
  const StationItem = ({ station, index }: { station: Station; index: number }) => {
    const { distance } = useStationProximity(station.latitude, station.longitude, 100);
    
    return (
      <motion.button
        onClick={() => station.status !== 'locked' && onStationClick(station.pathId, station.id)}
        disabled={station.status === 'locked'}
        className={`w-full rounded-xl p-4 border shadow-sm text-left transition-all ${getStatusColor(station.status)} ${
          station.status !== 'locked' ? 'hover:shadow-md hover:border-primary/50 cursor-pointer' : 'cursor-not-allowed'
        }`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 + index * 0.05 }}
        whileHover={station.status !== 'locked' ? { scale: 1.01 } : {}}
        whileTap={station.status !== 'locked' ? { scale: 0.99 } : {}}
      >
        <div className="flex gap-4">
          {/* Image */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
            <img
              src={station.imageUrl}
              alt={station.title}
              className="w-full h-full object-cover"
            />
            {station.status === 'completed' && (
              <div className="absolute inset-0 bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="truncate font-semibold">{station.title}</h4>
              {getStatusIcon(station.status)}
            </div>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
              {station.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {station.pathTitle}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {station.points} {t('points')}
              </Badge>
              {station.status !== 'completed' && distance !== null && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {Math.round(distance)}m
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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
        {/* Georgi Mentor */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div style={{ width: '48px', height: '48px', backgroundColor: '#0C690F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(12,105,15,0.2)' }}>
              <img src="/Logo.svg" alt="St.GeoARgen" style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm">
                {completedStations === totalStations
                  ? t('stationsMentorAllVisited')
                  : completedStations === 0
                  ? t('stationsMentorStart')
                  : t('stationsMentorProgress')
                    .replace('{completed}', String(completedStations))
                    .replace('{total}', String(totalStations))}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <motion.div
            className="bg-white rounded-xl p-4 border border-border shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-xl mb-1">{totalStations}</p>
            <p className="text-xs text-muted-foreground">{t('total')}</p>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 border border-border shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-xl mb-1">{completedStations}</p>
            <p className="text-xs text-muted-foreground">{t('completed')}</p>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 border border-border shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-xl mb-1">{availableStations}</p>
            <p className="text-xs text-muted-foreground">{t('available')}</p>
          </motion.div>
        </div>

        {/* Search Bar */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchStationOrPath')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </motion.div>

        {/* Filter Buttons */}
        <motion.div
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filterStatus === 'all'
                ? 'bg-primary text-white'
                : 'bg-white border border-border text-foreground hover:border-primary/50'
            }`}
          >
            {t('all')}
          </button>
          <button
            onClick={() => setFilterStatus('available')}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filterStatus === 'available'
                ? 'bg-primary text-white'
                : 'bg-white border border-border text-foreground hover:border-primary/50'
            }`}
          >
            {t('available')}
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filterStatus === 'completed'
                ? 'bg-primary text-white'
                : 'bg-white border border-border text-foreground hover:border-primary/50'
            }`}
          >
            {t('completed')}
          </button>
        </motion.div>

        {/* Stations List */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {filteredStations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('noStationsFound')}</p>
            </div>
          ) : (
            filteredStations.map((station, index) => (
              <StationItem 
                key={`${station.pathId}-${station.id}`} 
                station={station} 
                index={index} 
              />
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}