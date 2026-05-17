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
  const percentage = (current / total) * 100;

  return (
    <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="font-semibold">{t('yourProgress')}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {t('progressStationsCount', { current, total })}
        </span>
      </div>
      
      <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
          <Trophy className="w-4 h-4" />
          <span className="text-sm font-semibold">{points} {t('points')}</span>
        </div>
        <span className="text-sm font-semibold">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}