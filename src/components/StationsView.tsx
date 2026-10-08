import { MapPin, CheckCircle2, Lock, Play, Search, Check, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useStationProximity } from './ARComponents/ARComponentBase';
import { BackLink } from './PageHeader';

const ease = [0.16, 1, 0.3, 1] as const;

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
  isLoggedIn: boolean;
  onBack: () => void;
}

export function StationsView({ paths, onStationClick, isLoggedIn, onBack }: StationsViewProps) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-16">
        <BackLink onBack={onBack} />

        {/* Georgi */}
        <motion.div
          className="mt-5 mb-5 brand-gradient relative overflow-hidden rounded-[24px] p-5 text-white shadow-md"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          <div className="topo-texture absolute inset-0" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-md">
              <img src="/Logo.svg" alt="" className="w-7 h-7 object-contain" />
            </span>
            <p className="text-[15px] font-semibold leading-snug">
              {completedStations === totalStations
                ? t('stationsMentorAllVisited')
                : completedStations === 0
                  ? t('stationsMentorStart')
                  : t('stationsMentorProgress')
                    .replace('{completed}', String(completedStations))
                    .replace('{total}', String(totalStations))}
            </p>
          </div>
        </motion.div>

        {/* Kennzahlen */}
        <dl className="surface-card grid grid-cols-3 divide-x divide-border mb-5 py-4">
          {[
            { value: totalStations, label: t('total'), Icon: MapPin },
            { value: completedStations, label: t('completed'), Icon: CheckCircle2 },
            { value: availableStations, label: t('available'), Icon: Play },
          ].map(({ value, label, Icon }) => (
            <div key={label} className="px-3 text-center">
              <dd className="text-2xl font-extrabold tabular-nums leading-none">{value}</dd>
              <dt className="mt-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span aria-hidden="true">{label}</span>
              </dt>
            </div>
          ))}
        </dl>

        {/* Suche */}
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder={t('searchStationOrPath')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-input bg-card shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-[border-color,box-shadow]"
          />
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4">
          {([
            ['all', t('all')],
            ['available', t('available')],
            ['completed', t('completed')],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filterStatus === value}
              onClick={() => setFilterStatus(value)}
              className={`h-10 px-4 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${filterStatus === value
                ? 'bg-foreground text-white'
                : 'bg-card border border-border text-foreground hover:border-border-strong'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div className="space-y-3">
          {filteredStations.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border-strong">
              <Search className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">{t('noStationsFound')}</p>
            </div>
          ) : (
            filteredStations.map((station, index) => (
              <StationItem
                key={`${station.pathId}-${station.id}`}
                station={station}
                index={index}
                isLoggedIn={isLoggedIn}
                onStationClick={onStationClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface StationItemProps {
  station: Station;
  index: number;
  isLoggedIn: boolean;
  onStationClick: (pathId: string, stationId: number) => void;
}

function StationItem({ station, index, isLoggedIn, onStationClick }: StationItemProps) {
  const { t } = useLanguage();
  const { distance } = useStationProximity(station.latitude, station.longitude, 100);
  const displayStatus: Station['status'] = isLoggedIn ? station.status : 'locked';
  const isLocked = displayStatus === 'locked';
  const isCompleted = displayStatus === 'completed';

  return (
    <motion.button
      onClick={() => !isLocked && onStationClick(station.pathId, station.id)}
      disabled={isLocked}
      className={`group w-full surface-card p-3 text-left transition-shadow ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.4, ease }}
      whileTap={!isLocked ? { scale: 0.985 } : {}}
    >
      <div className="flex gap-3.5">
        <div className="w-[84px] h-[84px] rounded-2xl overflow-hidden bg-muted flex-shrink-0 relative">
          <img
            src={station.imageUrl}
            alt=""
            width={84}
            height={84}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          {isCompleted && (
            <div className="absolute inset-0 bg-primary/55 flex items-center justify-center" aria-hidden="true">
              <span className="w-9 h-9 rounded-full bg-white text-primary flex items-center justify-center">
                <Check className="w-5 h-5" strokeWidth={3} />
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate font-bold">{station.title}</h4>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-primary-soft text-primary' : isLocked ? 'bg-muted text-muted-foreground' : 'bg-primary text-white'}`} aria-hidden="true">
              {isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
            {station.description}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-xs font-bold text-gold-foreground tabular-nums">
              <Trophy className="w-3 h-3 text-gold" />
              {station.points} {t('points')}
            </span>
            {!isCompleted && distance !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-gray-700 tabular-nums">
                <MapPin className="w-3 h-3" />
                {distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`}
              </span>
            )}
            <span className="text-xs text-muted-foreground truncate">{station.pathTitle}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
