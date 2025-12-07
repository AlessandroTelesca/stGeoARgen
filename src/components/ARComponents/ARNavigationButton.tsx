import { motion } from 'motion/react';

interface ARNavigationButtonProps {
  onNavigateToNextStation: () => void;
}

export const ARNavigationButton = ({ onNavigateToNextStation }: ARNavigationButtonProps) => {
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
        <span className="material-icons" style={{ fontSize: '28px', color: 'white' }}>
          arrow_forward
        </span>
        <span className="ar-navigate-button-text">Zur nächsten Station</span>
      </div>
    </motion.button>
  );
};
