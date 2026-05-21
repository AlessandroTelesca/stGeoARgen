import { Trophy, MapPin, Star, TrendingUp, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import { PathCard } from './PathCard';

interface Path {
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

interface DashboardProps {
  paths: Path[];
  totalPoints: number;
  totalCompletedStations: number;
  onPathSelect: (pathId: string) => void;
  onNavigateToPaths?: () => void;
  onOpenQRScanner?: () => void;
  onNavigate?: (view: string) => void;
  username?: string | null;
}

export function Dashboard({ paths, totalPoints, totalCompletedStations, onPathSelect, onNavigateToPaths, onOpenQRScanner, onNavigate, username }: DashboardProps) {
  const totalStations = paths.reduce((sum, path) => sum + path.totalStations, 0);
  const completionPercentage = totalStations > 0 ? (totalCompletedStations / totalStations) * 100 : 0;

  // Calculate completed paths
  const completedPaths = paths.filter(path => path.completedStations === path.totalStations).length;

  // Calculate next voucher milestone
  const voucherMilestones = [50, 100, 150, 180, 200, 225];
  const nextMilestone = voucherMilestones.find(m => m > totalPoints) || 225;
  const pointsToNextVoucher = nextMilestone - totalPoints;
  const hasUnlockedVoucher = totalPoints >= 50;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 pb-8">
        {/* Header */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold mb-2">{getGreeting()}{username ? `, ${username}` : ''}!</h2>
          <p className="text-muted-foreground mb-6">
            Bereit für ein neues Abenteuer in St.Georgen?
          </p>
          <h3 className="font-semibold">Dashboard</h3>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.button
            onClick={() => onNavigate?.('points')}
            className="bg-white rounded-xl p-4 border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">Punkte</p>
          </motion.button>

          <motion.button
            onClick={onNavigateToPaths}
            className="bg-white rounded-xl p-4 border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{completedPaths}</p>
            <p className="text-sm text-muted-foreground">Abgeschl. Pfade</p>
          </motion.button>
        </div>

        {/* Progress Card */}
        <motion.button
          onClick={() => onNavigate?.('progress')}
          className="w-full bg-gradient-to-br from-primary to-primary-light text-white rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all text-left"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold mb-1">Deine Reise</h3>
              <p className="text-sm opacity-90">
                {totalCompletedStations} von {totalStations} Stationen erkundet
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
          </div>

          <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 1, delay: 0.7 }}
            />
          </div>

          <p className="text-sm opacity-90">
            {completionPercentage === 100
              ? 'Themenpfad abgeschlossen!'
              : `Noch ${totalStations - totalCompletedStations} Stationen zu entdecken!`}
          </p>
        </motion.button>

        {/* Paths Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Themenpfade</h3>
            {paths.length > 0 && (
              <button
                onClick={onNavigateToPaths}
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                Alle ansehen
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paths.map((path, index) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <PathCard {...path} onClick={() => onPathSelect(path.id)} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* QR Scanner CTA */}
        {onOpenQRScanner && (
          <motion.button
            onClick={onOpenQRScanner}
            className="w-full bg-white rounded-2xl p-6 mb-6 shadow-sm border-2 border-dashed border-primary/30 hover:border-primary hover:shadow-md transition-all group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold mb-1">QR-Code scannen</h4>
                <p className="text-sm text-muted-foreground">
                  Scanne einen QR-Code an einer Station, um direkt zu starten
                </p>
              </div>
              <svg className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        )}

        {/* Rewards CTA */}
        <motion.button
          onClick={() => onNavigate?.('rewards')}
          className="w-full bg-white rounded-2xl p-6 mb-8 shadow-sm border-2 border-gray-200 hover:border-primary hover:shadow-md transition-all group relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {/* Green accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-light to-primary" />

          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${hasUnlockedVoucher
                ? 'bg-primary/10 group-hover:bg-primary/20'
                : 'bg-gray-100 group-hover:bg-gray-200'
              }`}>
              <Gift className={`w-8 h-8 ${hasUnlockedVoucher ? 'text-primary' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-semibold mb-1">
                {hasUnlockedVoucher ? 'Gutschein verfügbar!' : 'Nächster Gutschein'}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {totalPoints >= 225
                  ? 'Alle Gutscheine freigeschaltet! Jetzt einlösen.'
                  : pointsToNextVoucher === 0
                    ? 'Glückwunsch! Neuer Gutschein verfügbar!'
                    : `Noch ${pointsToNextVoucher} Punkte bis zum nächsten Gutschein`
                }
              </p>
              {/* Progress bar */}
              {totalPoints < 225 && (
                <div className="space-y-1.5">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                      style={{ width: `${(totalPoints / nextMilestone) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary font-semibold">{totalPoints} Punkte</span>
                    <span className="text-muted-foreground">{nextMilestone} Punkte</span>
                  </div>
                </div>
              )}
            </div>
            <svg className={`w-6 h-6 transition-colors flex-shrink-0 self-center ${hasUnlockedVoucher ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </motion.button>
      </div>
    </div>
  );
}