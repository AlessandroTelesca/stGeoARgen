import { motion } from 'motion/react';
import { Home, User, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ARTopBarProps {
  onNavigateHome: () => void;
  onProfileClick: () => void;
  profileMenuOpen: boolean;
  username: string | null;
}

export const ARTopBar = ({ onNavigateHome, onProfileClick, profileMenuOpen, username }: ARTopBarProps) => {
  const { t } = useLanguage();
  return (
    <div className="ar-top-bar">
      <motion.button
        onClick={onNavigateHome}
        className="ar-home-button"
        whileTap={{ scale: 0.94 }}
        aria-label={t('home')}
      >
        <Home className="w-6 h-6" />
      </motion.button>

      <motion.button
        onClick={onProfileClick}
        className="ar-profile-button"
        whileTap={{ scale: 0.97 }}
        aria-expanded={profileMenuOpen}
      >
        <span className="ar-profile-avatar" aria-hidden="true">
          {username ? username.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="ar-profile-name block">{username || t('guest')}</span>
          <span className="ar-profile-email block">{username ? t('loggedIn') : t('notLoggedIn')}</span>
        </span>
        <motion.span
          animate={{ rotate: profileMenuOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center text-muted-foreground"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </motion.button>
    </div>
  );
};
