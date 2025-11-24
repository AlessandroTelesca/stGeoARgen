import { motion } from 'motion/react';
import { Trophy, X, MapPin, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useState } from 'react';

interface Locality {
  id: string;
  name: string;
  type: string;
  description: string;
  address: string;
}

interface RewardDialogProps {
  onClose: () => void;
  onSelectReward: (localityId: string) => void;
}

const localities: Locality[] = [
  {
    id: 'locality1',
    name: 'Lokalität 1',
    type: 'Café & Restaurant',
    description: '10% Rabatt auf Speisen und Getränke',
    address: 'Hauptstraße 12, St.Georgen',
  },
  {
    id: 'locality2',
    name: 'Lokalität 2',
    type: 'Museum & Kultur',
    description: 'Freier Eintritt für eine Person',
    address: 'Kulturplatz 5, St.Georgen',
  },
  {
    id: 'locality3',
    name: 'Lokalität 3',
    type: 'Souvenirshop',
    description: '15% Rabatt auf alle Artikel',
    address: 'Marktstraße 23, St.Georgen',
  },
];

export function RewardDialog({ onClose, onSelectReward }: RewardDialogProps) {
  const [selectedLocality, setSelectedLocality] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedLocality) {
      onSelectReward(selectedLocality);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 20 }}
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-[#0C690F] to-[#0a5a0d] text-white p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4"
            >
              <Trophy className="w-12 h-12 text-yellow-300" />
            </motion.div>
            <h2 className="text-2xl mb-2">Herzlichen Glückwunsch!</h2>
            <p className="text-white/90">
              Du hast alle Stationen erfolgreich abgeschlossen und die volle Punktzahl erreicht!
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg mb-4 text-gray-900">
            Wähle deinen Gutschein:
          </h3>

          <div className="space-y-3">
            {localities.map((locality) => (
              <Card
                key={locality.id}
                className={`p-4 cursor-pointer transition-all border-2 ${
                  selectedLocality === locality.id
                    ? 'border-[#0C690F] bg-[#0C690F]/5'
                    : 'border-gray-200 hover:border-[#0C690F]/50'
                }`}
                onClick={() => setSelectedLocality(locality.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedLocality === locality.id
                        ? 'border-[#0C690F] bg-[#0C690F]'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedLocality === locality.id && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h4 className="text-gray-900">{locality.name}</h4>
                        <p className="text-sm text-gray-600">{locality.type}</p>
                      </div>
                    </div>
                    
                    <p className="text-[#0C690F] mb-2">
                      {locality.description}
                    </p>
                    
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{locality.address}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Später
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedLocality}
              className="flex-1 bg-[#0C690F] hover:bg-[#0a5a0d] text-white"
            >
              Gutschein einlösen
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            Der Gutschein wird nach der Auswahl an deine E-Mail gesendet
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
