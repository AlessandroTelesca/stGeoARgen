import { RefObject } from 'react';
import { motion } from 'motion/react';
import { Home, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ARTopBarProps {
  onNavigateHome: () => void;
  onProfileClick: () => void;
  profileMenuOpen: boolean;
  username: string | null;
}

export const ARTopBar = ({ onNavigateHome, onProfileClick, profileMenuOpen, username }: ARTopBarProps) => {
  const { t } = useTranslation();

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
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(to bottom right, #0C690F, #0e7a11)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          flexShrink: 0
        }}>
          <User style={{ width: '20px', height: '20px', color: 'white' }} />
        </div>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div className="ar-profile-name">{username || t('ar.profileMenu.guest')}</div>
          <div className="ar-profile-email">{username ? t('ar.profileMenu.loggedIn') : t('ar.profileMenu.notLoggedIn')}</div>
        </div>
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
