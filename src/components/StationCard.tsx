import { MapPin, CheckCircle2, QrCode, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Trophy } from 'lucide-react';

interface StationCardProps {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  status: 'locked' | 'available' | 'completed';
  points: number;
  onClick: () => void;
}

export function StationCard({ title, description, imageUrl, status, points, onClick }: StationCardProps) {
  const isLocked = false; // Stations are never locked - user can start anywhere
  const isCompleted = status === 'completed';

  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative h-40 overflow-hidden">
        <ImageWithFallback 
          src={imageUrl} 
          alt={title}
          className="w-full h-full object-cover"
        />
        
        {isCompleted && (
          <div className="absolute top-3 right-3 bg-primary text-white rounded-full p-1.5 shadow-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        )}
        
        {!isCompleted && (
          <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md">
            <Play className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold pr-2">{title}</h3>
          <div className="flex items-center gap-1.5 text-sm whitespace-nowrap bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
            <Trophy className="w-3.5 h-3.5" />
            <span className="font-semibold">{points}</span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {description}
        </p>
        
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{isCompleted ? 'Abgeschlossen' : 'Verfügbar'}</span>
          </div>
          {!isCompleted && (
            <span className="text-xs font-medium text-primary">Jetzt starten →</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}