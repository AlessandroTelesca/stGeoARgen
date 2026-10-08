import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ProgressBarProps {
  current: number;
  total: number;
  points: number;
}

export function ProgressBar({ current, total, points }: ProgressBarProps) {
  const { t } = useLanguage();
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold">{t('yourProgress')}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {t('progressStationsCount', { current, total })}
        </span>
      </div>

      <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary-lighter rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gold-soft text-gold-foreground px-3 py-1.5 rounded-full">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="text-sm font-bold tabular-nums">{points} {t('points')}</span>
        </div>
        <span className="text-lg font-extrabold tabular-nums text-primary">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}
