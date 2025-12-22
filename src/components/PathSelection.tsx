import { motion } from 'motion/react';
import { MapPin, Trophy, Clock, ChevronRight, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './ui/carousel';

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

interface PathSelectionProps {
  paths: PathDetail[];
  onPathSelect: (pathId: string) => void;
  onBack: () => void;
}

export function PathSelection({ paths, onPathSelect, onBack }: PathSelectionProps) {
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

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Sticky Header */}
      <div className="sticky top-16 bg-background/80 backdrop-blur-sm z-20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Zurück</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold mb-2">Themenpfade</h2>
          <p className="text-muted-foreground">
            Wähle einen Pfad und erkunde St.Georgen auf verschiedenen thematischen Routen
          </p>
        </motion.div>

        {/* Paths Carousel */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {paths.map((path) => {
                const progress = path.totalStations > 0
                  ? (path.completedStations / path.totalStations) * 100
                  : 0;
                const isCompleted = path.completedStations === path.totalStations;

                return (
                  <CarouselItem key={path.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <motion.button
                      onClick={() => onPathSelect(path.id)}
                      className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-border transition-all text-left"
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden">
                        <ImageWithFallback
                          src={path.imageUrl}
                          alt={path.title}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Difficulty Badge */}
                        <div className="absolute top-4 left-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${
                              difficultyColors[path.difficulty].bg
                            } ${difficultyColors[path.difficulty].text} ${
                              difficultyColors[path.difficulty].border
                            }`}
                          >
                            {path.difficulty}
                          </span>
                        </div>

                        {/* Completion Badge */}
                        {isCompleted && (
                          <div className="absolute top-4 right-4">
                            <div className="bg-success text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
                              <Star className="w-3 h-3" fill="currentColor" />
                              Abgeschlossen
                            </div>
                          </div>
                        )}

                        {/* Progress Overlay */}
                        {!isCompleted && progress > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                            <div className="flex items-center gap-2 text-white text-xs">
                              <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-white rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="font-medium">{Math.round(progress)}%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                          {path.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {path.description}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">
                              {path.completedStations}/{path.totalStations} Stationen
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Trophy className="w-4 h-4" />
                            <span className="text-sm">
                              {path.earnedPoints}/{path.totalPoints} Pkt
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{path.estimatedTime}</span>
                        </div>

                        {/* Action */}
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                          <span className="text-xs font-medium text-primary">
                            Jetzt starten →
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {paths.length > 1 && (
              <>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </>
            )}
          </Carousel>
        </motion.div>

        {/* Info Section */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-sm border border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-semibold mb-3">So funktioniert's</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-sm">Pfad auswählen</p>
                <p className="text-xs text-muted-foreground">
                  Wähle einen thematischen Pfad, der dich interessiert
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-sm">Stationen entdecken</p>
                <p className="text-xs text-muted-foreground">
                  Besuche die Stationen und erlebe AR-Inhalte
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-sm">Punkte sammeln</p>
                <p className="text-xs text-muted-foreground">
                  Sammle Punkte und schalte Gutscheine frei
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
