import { X, QrCode, CheckCircle2, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Geogi } from './Geogi';
import { Trophy } from 'lucide-react';
import { MapPin, Clock, Target } from 'lucide-react';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface StationDetailProps {
  station: {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    longDescription: string;
    points: number;
    status: 'locked' | 'available' | 'completed';
    quiz?: QuizQuestion;
    arContent?: string;
    latitude: number;
    longitude: number;
  };
  onClose: () => void;
  onComplete: (stationId: number, earnedPoints: number) => void;
}

export function StationDetail({ station, onClose, onComplete }: StationDetailProps) {
  const [showAR, setShowAR] = useState(false);
  const [showGeogi, setShowGeogi] = useState(true);

  const handleNavigateToStation = () => {
    // Open Google Maps with directions to the station
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    window.open(mapsUrl, '_blank');
  };

  const handleARScan = () => {
    setShowAR(true);
    setTimeout(() => {
      setShowAR(false);
      onComplete(station.id, station.points);
    }, 3000);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-background z-50 overflow-y-auto"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-border p-4 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center hover:bg-muted/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
            <Trophy className="w-4 h-4" />
            <span className="font-semibold">{station.points} Punkte</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Hero Image */}
        <div className="relative h-64 rounded-2xl overflow-hidden mb-6">
          <ImageWithFallback
            src={station.imageUrl}
            alt={station.title}
            className="w-full h-full object-cover"
          />
          {station.status === 'completed' && (
            <div className="absolute top-4 right-4 bg-black text-white rounded-full p-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <h1 className="mb-2">{station.title}</h1>
            <p className="text-muted-foreground">
              {station.longDescription}
            </p>
          </div>

          {/* AR Scanner Section */}
          {!showAR && station.status !== 'completed' && (
            <motion.div
              className="bg-black text-white rounded-2xl p-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-black" />
              </div>
              <h3 className="font-semibold mb-2">QR-Code scannen</h3>
              <p className="text-sm opacity-90 mb-6">
                Scanne den QR-Code vor Ort, um das AR-Erlebnis zu starten und mehr über diesen Ort zu erfahren.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleNavigateToStation}
                  className="w-full bg-white text-black py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Navigation className="w-5 h-5" />
                  <span>Zur Station navigieren</span>
                </button>
                
                {/* Demo Button */}
                <button
                  onClick={() => {
                    onComplete(station.id, station.points);
                  }}
                  className="w-full bg-primary/20 text-white border-2 border-white/30 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Als Erledigt markieren (Demo)</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* AR View Simulation */}
          <AnimatePresence>
            {showAR && (
              <motion.div
                className="fixed inset-0 bg-black z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-white text-center">
                  <div className="w-32 h-32 border-4 border-white rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                    <QrCode className="w-16 h-16" />
                  </div>
                  <h3 className="font-semibold mb-2">AR-Modus aktiv</h3>
                  <p className="text-sm opacity-80">
                    Scanne die Umgebung...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completed State */}
          {station.status === 'completed' && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Station abgeschlossen</h3>
              <p className="text-sm text-muted-foreground">
                Du hast diese Station bereits besucht und {station.points} Punkte gesammelt.
              </p>
            </div>
          )}

          {/* Additional Info */}
          <div className="bg-white border border-border rounded-2xl p-4">
            <h4 className="font-semibold mb-3">Wissenswertes</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Im Zentrum von St.Georgen</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Geschätzte Dauer: 10-15 Minuten</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>Schwierigkeit: Einfach</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Geogi Helper */}
      <Geogi
        message="Nutze die Navigation, um zur Station zu gelangen und scanne vor Ort den QR-Code!"
        show={showGeogi && station.status !== 'completed'}
        onClose={() => setShowGeogi(false)}
        position="bottom-right"
      />
    </motion.div>
  );
}