import { RefObject } from 'react';
import { motion } from 'motion/react';
import { Home } from 'lucide-react';
import { GeorgiAvatar } from '../Georgi';

interface ARTopBarProps {
  onNavigateHome: () => void;
  onProfileClick: () => void;
  profileMenuOpen: boolean;
}

export const ARTopBar = ({ onNavigateHome, onProfileClick, profileMenuOpen }: ARTopBarProps) => {
  return (
    <div className="ar-top-bar">
      {/* Home Button */}
      <motion.button
        onClick={onNavigateHome}
        className="ar-home-button"
        whileTap={{ scale: 0.95 }}
      >
        <Home style={{ width: '28px', height: '28px', color: '#0C690F' }} />
      </motion.button>

      {/* Profile Button */}
      <motion.button
        onClick={onProfileClick}
        className="ar-profile-button"
        whileTap={{ scale: 0.98 }}
      >
        <GeorgiAvatar size="sm" />
        <div style={{ textAlign: 'left' }}>
          <div className="ar-profile-name">Max</div>
          <div className="ar-profile-email">Max@gmail.com</div>
        </div>
        <div className="ar-profile-points">123 👑</div>
        <motion.div
          animate={{ rotate: profileMenuOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </motion.div>
      </motion.button>
    </div>
  );
};
