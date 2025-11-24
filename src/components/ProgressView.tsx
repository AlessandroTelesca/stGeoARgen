import { TrendingUp, Target, Clock, Award, MapPin, Trophy, CheckCircle2, Calendar, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Geogi } from './Geogi';
import { Progress } from './ui/progress';

interface ProgressViewProps {
  paths: Array<{
    id: string;
    title: string;
    totalStations: number;
    completedStations: number;
    totalPoints: number;
    earnedPoints: number;
    difficulty: 'Einfach' | 'Mittel' | 'Schwer';
    estimatedTime: string;
  }>;
  totalPoints: number;
  totalCompletedStations: number;
  onBack: () => void;
}

export function ProgressView({ paths, totalPoints, totalCompletedStations, onBack }: ProgressViewProps) {
  const totalStations = paths.reduce((sum, path) => sum + path.totalStations, 0);
  const maxPossiblePoints = paths.reduce((sum, path) => sum + path.totalPoints, 0);
  const completionPercentage = totalStations > 0 ? (totalCompletedStations / totalStations) * 100 : 0;

  const completedPaths = paths.filter(p => p.completedStations === p.totalStations && p.totalStations > 0).length;
  const inProgressPaths = paths.filter(p => p.completedStations > 0 && p.completedStations < p.totalStations).length;

  // Mock statistics - in a real app, these would be tracked
  const daysActive = 1;
  const currentStreak = 1;

  // Calculate average completion per path
  const pathCompletionRates = paths.map(path => ({
    ...path,
    completionRate: path.totalStations > 0 ? (path.completedStations / path.totalStations) * 100 : 0,
  })).sort((a, b) => b.completionRate - a.completionRate);

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
            <span className="font-medium">Zurück</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Geogi Mentor */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border flex items-center gap-3">
            <Geogi size={48} />
            <div className="flex-1">
              <p className="text-sm">
                {completionPercentage === 100
                  ? "Unglaublich! Du hast alle Pfade gemeistert!"
                  : completionPercentage >= 75
                  ? `Fast geschafft! Nur noch ${totalStations - totalCompletedStations} Stationen!`
                  : completionPercentage >= 50
                  ? "Du machst tolle Fortschritte! Weiter so!"
                  : completionPercentage > 0
                  ? "Ein guter Start! Entdecke weitere spannende Orte!"
                  : "Bereit für dein Abenteuer? Starte jetzt!"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Overall Progress Card */}
        <motion.div
          className="bg-gradient-to-br from-primary to-primary-light text-white rounded-2xl p-6 mb-6 shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90 mb-1">Gesamtfortschritt</p>
              <h2 className="text-4xl">{Math.round(completionPercentage)}%</h2>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>

          <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>

          <p className="text-sm opacity-90">
            {totalCompletedStations} von {totalStations} Stationen abgeschlossen
          </p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            className="bg-white rounded-xl p-4 border border-border shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl mb-1">{completedPaths}</p>
            <p className="text-sm text-muted-foreground">Pfade fertig</p>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 border border-border shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl mb-1">{inProgressPaths}</p>
            <p className="text-sm text-muted-foreground">In Arbeit</p>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 border border-border shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl mb-1">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">Punkte</p>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 border border-border shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl mb-1">{currentStreak}</p>
            <p className="text-sm text-muted-foreground">Tage Streak</p>
          </motion.div>
        </div>

        {/* Points Progress */}
        <motion.div
          className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3>Punkte-Fortschritt</h3>
            <span className="text-primary">
              {totalPoints}/{maxPossiblePoints}
            </span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${maxPossiblePoints > 0 ? (totalPoints / maxPossiblePoints) * 100 : 0}%` }}
              transition={{ duration: 1, delay: 0.7 }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {maxPossiblePoints - totalPoints} Punkte noch verfügbar
          </p>
        </motion.div>

        {/* Path-wise Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="mb-4">Fortschritt nach Pfad</h3>
          <div className="space-y-4">
            {pathCompletionRates.map((path, index) => (
              <motion.div
                key={path.id}
                className="bg-white rounded-xl p-5 border border-border shadow-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="mb-1">{path.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {path.completedStations}/{path.totalStations}
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        {path.earnedPoints}/{path.totalPoints}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl">{Math.round(path.completionRate)}%</p>
                    {path.completionRate === 100 && (
                      <span className="text-xs text-success">✓ Fertig</span>
                    )}
                  </div>
                </div>

                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      path.completionRate === 100
                        ? 'bg-success'
                        : 'bg-primary'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${path.completionRate}%` }}
                    transition={{ duration: 0.8, delay: 0.9 + index * 0.1 }}
                  />
                </div>

                <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {path.estimatedTime}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    path.difficulty === 'Einfach' 
                      ? 'bg-success/10 text-success'
                      : path.difficulty === 'Mittel'
                      ? 'bg-warning/10 text-warning-foreground'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {path.difficulty}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Motivation Card */}
        <motion.div
          className="mt-6 bg-gradient-to-r from-primary/10 to-primary-light/10 rounded-2xl p-6 border border-primary/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="text-primary">Nächstes Ziel</h4>
              <p className="text-sm text-muted-foreground">
                {completionPercentage === 100
                  ? "Alle Ziele erreicht!"
                  : inProgressPaths > 0
                  ? "Schließe einen Pfad ab"
                  : "Starte einen neuen Pfad"}
              </p>
            </div>
          </div>
          {completionPercentage < 100 && (
            <p className="text-sm text-muted-foreground">
              {totalStations - totalCompletedStations === 1
                ? "Noch 1 Station bis zum Abschluss!"
                : `Noch ${totalStations - totalCompletedStations} Stationen zu entdecken`}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}