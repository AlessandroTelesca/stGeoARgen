import { Trophy, Award, Star, Zap, Target, Crown, Medal, Gift, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { Georgi } from './Georgi';

interface Achievement {
  id: string;
  title: string;
  description: string;
  points: number;
  unlocked: boolean;
  icon: React.ReactNode;
  progress?: number;
  maxProgress?: number;
}

interface PointsViewProps {
  totalPoints: number;
  paths: Array<{
    id: string;
    title: string;
    earnedPoints: number;
    totalPoints: number;
  }>;
  onBack: () => void;
  onNavigateToRewards?: () => void;
}

export function PointsView({ totalPoints, paths, onBack, onNavigateToRewards }: PointsViewProps) {
  const { t } = useLanguage();
  // Calculate level based on points
  const level = Math.floor(totalPoints / 100) + 1;
  const pointsForNextLevel = level * 100;
  const progressToNextLevel = (totalPoints % 100) / 100;

  // Define achievements
  const achievements: Achievement[] = [
    {
      id: 'first-steps',
      title: t('achievementFirstStepsTitle'),
      description: t('achievementFirstStepsDesc'),
      points: 10,
      unlocked: totalPoints >= 10,
      icon: <Star className="w-6 h-6" />,
    },
    {
      id: 'explorer',
      title: t('achievementExplorerTitle'),
      description: t('achievementExplorerDesc'),
      points: 50,
      unlocked: totalPoints >= 50,
      icon: <Target className="w-6 h-6" />,
    },
    {
      id: 'adventurer',
      title: t('achievementAdventurerTitle'),
      description: t('achievementAdventurerDesc'),
      points: 100,
      unlocked: totalPoints >= 100,
      icon: <Medal className="w-6 h-6" />,
    },
    {
      id: 'pathfinder',
      title: t('achievementPathfinderTitle'),
      description: t('achievementPathfinderDesc'),
      points: 150,
      unlocked: paths.some(p => p.earnedPoints === p.totalPoints && p.totalPoints > 0),
      icon: <Award className="w-6 h-6" />,
    },
    {
      id: 'master',
      title: t('achievementMasterTitle'),
      description: t('achievementMasterDesc'),
      points: 200,
      unlocked: totalPoints >= 200,
      icon: <Crown className="w-6 h-6" />,
    },
    {
      id: 'completionist',
      title: t('achievementCompletionistTitle'),
      description: t('achievementCompletionistDesc'),
      points: 300,
      unlocked: paths.every(p => p.earnedPoints === p.totalPoints && p.totalPoints > 0),
      icon: <Trophy className="w-6 h-6" />,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const maxPossiblePoints = paths.reduce((sum, p) => sum + p.totalPoints, 0);

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
            <Georgi size={48} />
            <div className="flex-1">
              <p className="text-sm">
                {totalPoints === 0 
                  ? t('pointsHintStart')
                  : totalPoints >= maxPossiblePoints
                  ? t('pointsHintAllCollected')
                  : t('pointsHintProgress').replace('{points}', String(totalPoints))}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Level Card */}
        <motion.div
          className="bg-gradient-to-br from-primary to-primary-light text-white rounded-2xl p-6 mb-6 shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90 mb-1">{t('yourLevel')}</p>
              <h2 className="text-4xl">{level}</h2>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="opacity-90">{totalPoints} {t('points')}</span>
              <span className="opacity-90">{pointsForNextLevel} {t('points')}</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressToNextLevel * 100}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <p className="text-sm opacity-90 text-center">
              {t('pointsToLevel').replace('{points}', String(100 - (totalPoints % 100))).replace('{level}', String(level + 1))}
            </p>
          </div>
        </motion.div>

        {/* Points Overview */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            className="bg-white rounded-xl p-4 border border-border shadow-sm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl mb-1">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">{t('collectedPoints')}</p>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 border border-border shadow-sm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl mb-1">{maxPossiblePoints - totalPoints}</p>
            <p className="text-sm text-muted-foreground">{t('stillAvailable')}</p>
          </motion.div>
        </div>

        {/* Redeem Points CTA */}
        {onNavigateToRewards && (
          <motion.button
            onClick={onNavigateToRewards}
            className="w-full bg-white rounded-2xl p-5 mb-6 shadow-sm border-2 border-primary/30 hover:border-primary hover:shadow-md transition-all group relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* Green gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-light to-primary" />
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                <Gift className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold mb-0.5">
                  {totalPoints >= 50 ? t('redeemPoints') : t('viewRewards')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {totalPoints >= 50 
                    ? t('pointsVoucherReady').replace('{points}', String(totalPoints))
                    : t('collectMorePointsFirstVoucher').replace('{points}', String(50 - totalPoints))}
                </p>
              </div>
              <svg className="w-6 h-6 text-primary transition-transform group-hover:translate-x-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        )}

        {/* Points by Path */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="mb-4">{t('pointsByPath')}</h3>
          <div className="space-y-3">
            {paths.map((path, index) => (
              <motion.div
                key={path.id}
                className="bg-white rounded-xl p-4 border border-border shadow-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4>{path.title}</h4>
                  <span className="text-primary">
                    {path.earnedPoints}/{path.totalPoints}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${path.totalPoints > 0 ? (path.earnedPoints / path.totalPoints) * 100 : 0}%` }}
                    transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3>{t('achievements')}</h3>
            <span className="text-sm text-muted-foreground">
              {unlockedCount}/{achievements.length}
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                className={`rounded-xl p-4 border shadow-sm transition-all ${
                  achievement.unlocked
                    ? 'bg-white border-primary/30'
                    : 'bg-muted/30 border-border opacity-60'
                }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: achievement.unlocked ? 1 : 0.6, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.05 }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      achievement.unlocked
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className={!achievement.unlocked ? 'text-muted-foreground' : ''}>
                        {achievement.title}
                      </h4>
                      {achievement.unlocked && (
                        <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                          +{achievement.points}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}