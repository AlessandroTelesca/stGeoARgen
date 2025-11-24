import { ArrowRight, MapPin, Trophy, Clock } from 'lucide-react';
import { motion } from 'motion/react';
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
  const progress = (completedStations / totalStations) * 100;
  const isStarted = completedStations > 0;
  const isCompleted = completedStations === totalStations;

  const difficultyColors = {
    'Einfach': 'bg-success/10 text-success',
    'Mittel': 'bg-warning/10 text-warning-foreground',
    'Schwer': 'bg-destructive/10 text-destructive',
  };

  return (
    <motion.button
      onClick={onClick}
      className="w-full bg-white rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all text-left"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <ImageWithFallback
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        
        {isCompleted && (
          <div className="absolute top-3 right-3 bg-primary text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
            <span className="text-sm font-semibold">✓ Abgeschlossen</span>
          </div>
        )}
        
        {!isCompleted && isStarted && (
          <div className="absolute top-3 right-3 bg-white rounded-full px-3 py-1.5 shadow-lg">
            <span className="text-sm font-semibold">{Math.round(progress)}%</span>
          </div>
        )}

        <div className={`absolute top-3 left-3 ${difficultyColors[difficulty]} rounded-full px-3 py-1.5 text-xs font-semibold`}>
          {difficulty}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <MapPin className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Stationen</p>
            <p className="text-sm font-semibold">{completedStations}/{totalStations}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <Trophy className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Punkte</p>
            <p className="text-sm font-semibold">{earnedPoints}/{totalPoints}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Zeit</p>
            <p className="text-sm font-semibold">{estimatedTime}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {isStarted && !isCompleted && (
          <div className="mb-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-sm font-medium text-primary">
            {isCompleted ? 'Erneut starten' : isStarted ? 'Fortsetzen' : 'Starten'}
          </span>
          <ArrowRight className="w-5 h-5 text-primary" />
        </div>
      </div>
    </motion.button>
  );
}
