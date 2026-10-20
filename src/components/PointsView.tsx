import type { ReactNode } from 'react';
import { Trophy, Award, Star, Zap, Target, Crown, Medal, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePointConfig } from '../contexts/PointConfigContext';
import { GeorgiAvatar } from './Georgi';
import { BackLink } from './PageHeader';

// Texte/Icons je achievement_key. Schwellen, Badge-Werte und Reihenfolge kommen aus der DB (achievements).
const ACHIEVEMENT_UI: Record<string, { titleKey: string; descKey: string; icon: ReactNode }> = {
  'first-steps': { titleKey: 'achievementFirstStepsTitle', descKey: 'achievementFirstStepsDesc', icon: <Star className="w-6 h-6" /> },
  explorer: { titleKey: 'achievementExplorerTitle', descKey: 'achievementExplorerDesc', icon: <Target className="w-6 h-6" /> },
  adventurer: { titleKey: 'achievementAdventurerTitle', descKey: 'achievementAdventurerDesc', icon: <Medal className="w-6 h-6" /> },
  pathfinder: { titleKey: 'achievementPathfinderTitle', descKey: 'achievementPathfinderDesc', icon: <Award className="w-6 h-6" /> },
  master: { titleKey: 'achievementMasterTitle', descKey: 'achievementMasterDesc', icon: <Crown className="w-6 h-6" /> },
  completionist: { titleKey: 'achievementCompletionistTitle', descKey: 'achievementCompletionistDesc', icon: <Trophy className="w-6 h-6" /> },
};

interface PointsViewProps {
  /** Aktueller Kontostand (verdient minus für Gutscheine ausgegeben) */
  totalPoints: number;
  /** Insgesamt verdiente Punkte (Stationen + Schatzkiste) */
  earnedPoints: number;
  maxPossiblePoints: number;
  treasure: { earnedPoints: number; totalPoints: number };
  paths: Array<{
    id: string;
    title: string;
    earnedPoints: number;
    totalPoints: number;
  }>;
  onBack: () => void;
  onNavigateToRewards?: () => void;
}

export function PointsView({ totalPoints, earnedPoints, maxPossiblePoints, treasure, paths, onBack, onNavigateToRewards }: PointsViewProps) {
  const { t } = useLanguage();
  const { config, voucherPrices } = usePointConfig();

  // Level basiert auf verdienten Punkten, damit Gutscheinkäufe das Level nicht senken
  const levelSize = config?.settings.level_size;
  const level = levelSize ? Math.floor(earnedPoints / levelSize) + 1 : 0;

  const completedPathCount = paths.filter(p => p.earnedPoints === p.totalPoints && p.totalPoints > 0).length;
  const achievements = (config?.achievements ?? []).flatMap((a) => {
    const ui = ACHIEVEMENT_UI[a.key];
    if (!ui) return [];
    const unlocked =
      a.threshold_points !== null
        ? earnedPoints >= a.threshold_points
        : a.key === 'pathfinder'
          ? completedPathCount > 0
          : a.key === 'completionist' && paths.length > 0 && completedPathCount === paths.length;
    return [{
      id: a.key,
      title: t(ui.titleKey),
      description: t(ui.descKey, { points: a.threshold_points ?? '' }),
      points: a.badge_points,
      unlocked,
      icon: ui.icon,
    }];
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const cheapestVoucher = voucherPrices[0];
  const canRedeem = cheapestVoucher !== undefined && totalPoints >= cheapestVoucher;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-12">
        <BackLink onBack={onBack} />
        <div className="h-5" />
        {/* Georgi Mentor */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="surface-card p-4 flex items-center gap-3">
            <GeorgiAvatar size="md" animated={false} />
            <div className="flex-1">
              <p className="text-sm">
                {earnedPoints === 0 
                  ? t('pointsHintStart')
                  : earnedPoints >= maxPossiblePoints
                  ? t('pointsHintAllCollected')
                  : t('pointsHintProgress').replace('{points}', String(earnedPoints))}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Level Card */}
        {levelSize ? (
          <motion.div
            className="brand-gradient text-white rounded-[28px] p-6 mb-6 shadow-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm opacity-90 mb-1">{t('yourLevel')}</p>
                <h2 className="text-5xl font-extrabold tabular-nums">{level}</h2>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-90">{earnedPoints} {t('points')}</span>
                <span className="opacity-90">{level * levelSize} {t('points')}</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((earnedPoints % levelSize) / levelSize) * 100}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
              <p className="text-sm opacity-90 text-center">
                {t('pointsToLevel').replace('{points}', String(levelSize - (earnedPoints % levelSize))).replace('{level}', String(level + 1))}
              </p>
            </div>
          </motion.div>
        ) : null}

        {/* Points Overview */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            className="surface-card p-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-extrabold tabular-nums mb-0.5">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">{t('collectedPoints')}</p>
          </motion.div>

          <motion.div
            className="surface-card p-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-extrabold tabular-nums mb-0.5">{Math.max(0, maxPossiblePoints - earnedPoints)}</p>
            <p className="text-sm text-muted-foreground">{t('stillAvailable')}</p>
          </motion.div>
        </div>

        {/* Redeem Points CTA */}
        {onNavigateToRewards && (
          <motion.button
            onClick={onNavigateToRewards}
            className="w-full surface-card p-5 mb-6 hover:shadow-md transition-shadow group relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                <Gift className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold mb-0.5">
                  {canRedeem ? t('redeemPoints') : t('viewRewards')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {canRedeem
                    ? t('pointsVoucherReady').replace('{points}', String(totalPoints))
                    : cheapestVoucher !== undefined
                      ? t('collectMorePointsFirstVoucher').replace('{points}', String(cheapestVoucher - totalPoints))
                      : t('noVouchersAvailable')}
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
          <h3 className="text-lg font-bold tracking-tight mb-4">{t('pointsByPath')}</h3>
          <div className="space-y-3">
            {paths.map((path, index) => (
              <motion.div
                key={path.id}
                className="surface-card p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">{path.title}</h4>
                  <span className="text-primary font-bold tabular-nums">
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
            {treasure.totalPoints > 0 && (
              <div className="surface-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">{t('pointsTreasureBonus')}</h4>
                  <span className="text-primary font-bold tabular-nums">
                    {treasure.earnedPoints}/{treasure.totalPoints}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(treasure.earnedPoints / treasure.totalPoints) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Achievements */}
        {achievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold tracking-tight">{t('achievements')}</h3>
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
                    ? 'bg-card border-primary/25'
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
        )}
      </div>
    </div>
  );
}