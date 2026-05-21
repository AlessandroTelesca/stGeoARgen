import { motion } from 'motion/react';
import { Trophy, X, MapPin, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface Locality {
  id: string;
  nameKey: string;
  typeKey: string;
  descriptionKey: string;
  addressKey: string;
}

interface RewardDialogProps {
  onClose: () => void;
  onSelectReward: (localityId: string) => void;
}

const localities: Locality[] = [
  {
    id: 'locality1',
    nameKey: 'rewardLocality1Name',
    typeKey: 'rewardLocality1Type',
    descriptionKey: 'rewardLocality1Description',
    addressKey: 'rewardLocality1Address',
  },
];

export function RewardDialog({ onClose, onSelectReward }: RewardDialogProps) {
  const [selectedLocality, setSelectedLocality] = useState<string | null>(null);
  const { t } = useLanguage();

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
            <h2 className="text-2xl mb-2">{t('congratulations')}</h2>
            <p className="text-white/90">
              {t('congratulationsDescription')}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg mb-4 text-gray-900">
            {t('chooseVoucher')}
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
                        <h4 className="text-gray-900">{t(locality.nameKey)}</h4>
                        <p className="text-sm text-gray-600">{t(locality.typeKey)}</p>
                      </div>
                    </div>
                    
                    <p className="text-[#0C690F] mb-2">
                      {t(locality.descriptionKey)}
                    </p>
                    
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{t(locality.addressKey)}</span>
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
              {t('later')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedLocality}
              className="flex-1 bg-[#0C690F] hover:bg-[#0a5a0d] text-white"
            >
              {t('redeemVoucher')}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            {t('voucherEmailSent')}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
