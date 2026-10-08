import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogIn, UserPlus, LogOut } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ARProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onNavigateProfile?: () => void;
  onRegister?: () => void;
}

export const ARProfileMenu = ({
  isOpen,
  onClose,
  username,
  onLogin,
  onLogout,
  onNavigateProfile,
  onRegister,
}: ARProfileMenuProps) => {
  const { t } = useLanguage();

  const handleLogin = () => {
    onLogin();
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const handleRegister = () => {
    onRegister?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="ar-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Menu Panel */}
          <motion.div
            className="ar-menu-panel"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top right' }}
          >
            {!username ? (
              <>
                <button onClick={handleLogin} className="ar-menu-item">
                  <span className="ar-menu-icon ar-menu-icon-primary"><LogIn className="w-4 h-4" /></span>
                  {t('login')}
                </button>
                <button onClick={handleRegister} className="ar-menu-item">
                  <span className="ar-menu-icon ar-menu-icon-primary"><UserPlus className="w-4 h-4" /></span>
                  {t('register')}
                </button>
              </>
            ) : (
              <button onClick={handleLogout} className="ar-menu-item ar-menu-item-logout">
                <span className="ar-menu-icon ar-menu-icon-danger"><LogOut className="w-4 h-4" /></span>
                {t('logout')}
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
