import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ARNavigationButtonProps {
  onNavigateToNextStation: () => void;
}

export const ARNavigationButton = ({ onNavigateToNextStation }: ARNavigationButtonProps) => {
  const { t } = useLanguage();

  return (
    <motion.button
      onClick={onNavigateToNextStation}
      className="ar-navigate-button"
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="ar-navigate-button-content">
        <span className="ar-navigate-button-text">{t('navigateToNextStation')}</span>

        <ArrowRight size={28} color="white" aria-hidden="true" />
      </div>
    </motion.button>
  );
};
