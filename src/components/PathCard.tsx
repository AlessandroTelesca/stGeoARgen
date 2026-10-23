import { ArrowRight, MapPin, Trophy, Clock, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface PathCardProps {
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
  onClick: () => void;
}

export function PathCard({
  title,
  description,
  imageUrl,
  totalStations,
  completedStations,
  totalPoints,
  earnedPoints,
  estimatedTime,
  difficulty,
  onClick,
}: PathCardProps) {
  const { t } = useLanguage();
  const progress = totalStations > 0 ? (completedStations / totalStations) * 100 : 0;
  const isStarted = completedStations > 0;
  const isCompleted = totalStations > 0 && completedStations === totalStations;

  const difficultyDot = {
    'Einfach': 'bg-green-400',
    'Mittel': 'bg-gold-bright',
    'Schwer': 'bg-red-400',
  };

  return (
    <motion.button
      onClick={onClick}
      className="group w-full h-full flex flex-col surface-card text-left overflow-hidden pressable hover:shadow-md"
      whileTap={{ scale: 0.985 }}
    >
      {/* Bild */}
      <div className="relative h-48 flex-shrink-0 overflow-hidden">
        <ImageWithFallback
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/0" aria-hidden="true" />

        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white">
          <span className={`w-2 h-2 rounded-full ${difficultyDot[difficulty]}`} />
          {t(`pathEditorDifficulty${difficulty}`)}
        </div>

        {isCompleted && (
          <div className="absolute top-3 right-3 bg-primary text-white rounded-full pl-2 pr-3 py-1.5 flex items-center gap-1 shadow-md text-xs font-bold">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            {t('completed')}
          </div>
        )}

        {/* Titel auf dem Bild */}
        <div className="absolute inset-x-0 bottom-0 p-4 pt-10">
          <h3 className="text-xl font-bold text-white leading-tight drop-shadow-sm">{title}</h3>
          {isStarted && !isCompleted && (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 bg-white/25 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span className="text-xs font-bold text-white tabular-nums">{Math.round(progress)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Inhalt */}
      <div className="flex flex-1 flex-col p-4 pt-3.5">
        {/* Immer zwei Zeilen reservieren, damit Karten nebeneinander gleich hoch sind */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed min-h-[2lh]">
          {description}
        </p>

        <dl className="mt-4 grid grid-cols-3 divide-x divide-border rounded-2xl bg-secondary/70 py-2.5">
          <div className="px-2 text-center">
            <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="capitalize">{t('stations')}</span>
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums">{completedStations}/{totalStations}</dd>
          </div>
          <div className="px-2 text-center">
            <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Trophy className="w-3.5 h-3.5" />
              {t('points')}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums">{earnedPoints}/{totalPoints}</dd>
          </div>
          <div className="px-2 text-center">
            <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {t('time')}
            </dt>
            <dd className="mt-0.5 text-sm font-bold">{estimatedTime || '–'}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3 text-white transition-colors group-hover:bg-primary-dark">
            <span className="text-sm font-bold">{t('start')}</span>
            <ArrowRight className="w-5 h-5 flex-shrink-0 nudge-x" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
