import { motion } from 'motion/react';
import { MapPin, Trophy, Clock, TrendingUp, ChevronRight, Star, Award } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Geogi } from './Geogi';
import { useState, useEffect } from 'react';

interface PathDetail {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  totalStations: number;
  completedStations: number;
  totalPoints: number;
  earnedPoints: number;
  estimatedTime: string;
  difficulty: 'Einfach' | 'Mittel' | 'Schwer';
}

interface PathsOverviewProps {
  paths: PathDetail[];
  onPathSelect: (pathId: string) => void;
}

export function PathsOverview({ paths, onPathSelect }: PathsOverviewProps) {
  const [showGeogi, setShowGeogi] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGeogi(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const difficultyColors = {
    'Einfach': {
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'border-success/20',
    },
    'Mittel': {
      bg: 'bg-warning/10',
      text: 'text-warning-foreground',
      border: 'border-warning/20',
    },
    'Schwer': {
      bg: 'bg-destructive/10',
      text: 'text-destructive',
      border: 'border-destructive/20',
    },
  };

  const totalStats = {
    totalPaths: paths.length,
    completedPaths: paths.filter(p => p.completedStations === p.totalStations).length,
    totalPoints: paths.reduce((sum, p) => sum + p.earnedPoints, 0),
    totalCompletedStations: paths.reduce((sum, p) => sum + p.completedStations, 0),
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold mb-2">Alle Pfade</h2>
          <p className="text-muted-foreground">
            Erkunde St.Georgen auf verschiedenen thematischen Routen
          </p>
        </motion.div>

        {/* Overall Stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{totalStats.totalPaths}</p>
            <p className="text-sm text-muted-foreground">Pfade verfügbar</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{totalStats.completedPaths}</p>
            <p className="text-sm text-muted-foreground">Abgeschlossen</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{totalStats.totalPoints}</p>
            <p className="text-sm text-muted-foreground">Gesammelte Punkte</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{totalStats.totalCompletedStations}</p>
            <p className="text-sm text-muted-foreground">Stationen erkundet</p>
          </div>
        </motion.div>

        {/* Paths List */}
        <div className="space-y-6">
          {paths.map((path, index) => {
            const progress = (path.completedStations / path.totalStations) * 100;
            const isCompleted = path.completedStations === path.totalStations;
            const isStarted = path.completedStations > 0;
            const colors = difficultyColors[path.difficulty];

            return (
              <motion.div
                key={path.id}
                className="bg-white rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <div className="grid md:grid-cols-[300px_1fr] gap-0">
                  {/* Image Section */}
                  <div className="relative h-64 md:h-auto overflow-hidden">
                    <ImageWithFallback
                      src={path.imageUrl}
                      alt={path.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {isCompleted && (
                      <div className="absolute top-4 left-4 bg-primary text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-semibold">Abgeschlossen</span>
                      </div>
                    )}

                    {!isCompleted && isStarted && (
                      <div className="absolute top-4 left-4 bg-white rounded-full px-4 py-2 shadow-lg">
                        <span className="text-sm font-semibold">In Arbeit</span>
                      </div>
                    )}

                    <div className={`absolute bottom-4 left-4 ${colors.bg} ${colors.text} rounded-full px-4 py-2 text-sm font-semibold border ${colors.border}`}>
                      {path.difficulty}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2">{path.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {path.description}
                        </p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Stationen</span>
                        </div>
                        <p className="font-bold">
                          {path.completedStations}/{path.totalStations}
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Punkte</span>
                        </div>
                        <p className="font-bold">
                          {path.earnedPoints}/{path.totalPoints}
                        </p>
                      </div>

                      <div className="bg-muted/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Dauer</span>
                        </div>
                        <p className="font-bold">{path.estimatedTime}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Fortschritt</span>
                        <span className="text-sm font-bold text-primary">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                        />
                      </div>
                    </div>

                    {/* Status Messages */}
                    {isCompleted && (
                      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-semibold text-primary">
                              Perfekt abgeschlossen!
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Alle {path.totalStations} Stationen erkundet und {path.totalPoints} Punkte gesammelt
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isCompleted && isStarted && (
                      <div className="bg-muted/50 rounded-xl p-3 mb-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-semibold">
                              Noch {path.totalStations - path.completedStations} Stationen
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {path.totalPoints - path.earnedPoints} Punkte zu sammeln
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isStarted && (
                      <div className="bg-primary/5 rounded-xl p-3 mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-semibold">Bereit zum Starten</p>
                            <p className="text-xs text-muted-foreground">
                              {path.totalStations} Stationen warten auf dich
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CTA Button */}
                    <button
                      onClick={() => onPathSelect(path.id)}
                      className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl px-6 py-3 flex items-center justify-center gap-2 transition-colors"
                    >
                      <span className="font-semibold">
                        {isCompleted ? 'Erneut erkunden' : isStarted ? 'Weiter machen' : 'Jetzt starten'}
                      </span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {paths.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="font-semibold mb-2">Keine Pfade verfügbar</h3>
            <p className="text-muted-foreground">
              Es wurden noch keine Pfade erstellt.
            </p>
          </motion.div>
        )}
      </div>

      {/* Geogi Helper */}
      <Geogi
        message="Hier siehst du alle verfügbaren Pfade mit deinem Fortschritt. Wähle einen Pfad aus, um die Stationen zu erkunden!"
        show={showGeogi}
        onClose={() => setShowGeogi(false)}
        position="bottom-right"
      />
    </div>
  );
}
