import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, LogOut } from 'lucide-react';

interface ARProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
}

export const ARProfileMenu = ({
  isOpen,
  onClose,
  onProfileClick,
  onSettingsClick,
  onLogoutClick,
}: ARProfileMenuProps) => {
  const handleProfileClick = () => {
    onProfileClick();
    onClose();
  };

  const handleSettingsClick = () => {
    onSettingsClick();
    onClose();
  };

  const handleLogoutClick = () => {
    onLogoutClick();
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
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Menu Items */}
            <div className="ar-menu-items">
              <button onClick={handleProfileClick} className="ar-menu-item">
                <div className="ar-menu-icon ar-menu-icon-primary">
                  <User style={{ width: '20px', height: '20px', color: '#0C690F' }} />
                </div>
                <span className="ar-menu-text">Profil</span>
              </button>

              <button onClick={handleSettingsClick} className="ar-menu-item">
                <div className="ar-menu-icon ar-menu-icon-primary">
                  <Settings style={{ width: '20px', height: '20px', color: '#0C690F' }} />
                </div>
                <span className="ar-menu-text">Einstellungen</span>
              </button>

              <div className="ar-menu-divider" />

              <button onClick={handleLogoutClick} className="ar-menu-item ar-menu-item-logout">
                <div className="ar-menu-icon ar-menu-icon-danger">
                  <LogOut style={{ width: '20px', height: '20px', color: '#dc2626' }} />
                </div>
                <span className="ar-menu-text-danger">Abmelden</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
