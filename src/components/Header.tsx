import { Menu, X, Home, Map, QrCode, Settings, Gift, User, ChevronDown, LogIn, UserPlus, LogOut } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  title: string;
  onNavigate: (view: string) => void;
  currentView: string;
  username: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onRegister?: () => void;
}

export function Header({ title, onNavigate, currentView, username, onLogin, onLogout, onRegister }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { t, language } = useLanguage();

  const handleLogin = () => {
    onLogin();
    setUserDropdownOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setUserDropdownOpen(false);
  };

  const handleRegister = () => {
    onRegister?.();
    setUserDropdownOpen(false);
    setMenuOpen(false);
  };

  const menuItems = [
    { id: 'home', label: t('home'), Icon: Home },
    { id: 'paths', label: t('paths'), Icon: Map },
    { id: 'rewards', label: t('rewards'), Icon: Gift },
    { id: 'qr-scanner', label: t('qrScanner'), Icon: QrCode },
    { id: 'settings', label: t('settings'), Icon: Settings },
  ];

  const handleNavigate = (view: string) => {
    onNavigate(view);
    setMenuOpen(false);
  };

  return (
    <>
      <header
        className="surface-glass sticky top-0 z-30 border-b border-border/70"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <motion.button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 min-w-0 rounded-full -ml-1 pr-2 pl-1 py-1 pressable"
            aria-label={t('home')}
            initial="rest"
            animate="rest"
            whileHover="hover"
            whileTap="tap"
          >
            <span className="brand-gradient w-10 h-10 rounded-full flex items-center justify-center shadow-primary flex-shrink-0">
              {/* Georgi neigt neugierig den Kopf (Hover) und hüpft beim Antippen */}
              <motion.img
                src="/Logo.svg"
                alt=""
                className="w-6 h-6 object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
                variants={{
                  rest: { rotate: 0, y: 0 },
                  hover: { rotate: -10, y: 0, transition: { type: 'spring', duration: 0.4, bounce: 0.4 } },
                  tap: { rotate: -6, y: -3, transition: { type: 'spring', duration: 0.25, bounce: 0.5 } },
                }}
              />
            </span>
            <h1 className="text-[15px] font-bold tracking-tight text-foreground truncate">{title}</h1>
          </motion.button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted transition-colors flex-shrink-0"
            aria-label={t('menu')}
            aria-expanded={menuOpen}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Hamburger Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />

            <motion.aside
              className="fixed top-0 right-0 bottom-0 w-[min(320px,86vw)] bg-card rounded-l-[28px] shadow-2xl z-50 overflow-y-auto flex flex-col"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 34, stiffness: 340 }}
              aria-label={t('menu')}
            >
              <div className="px-5 pt-4 pb-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-semibold text-muted-foreground">St.GeoARgen</span>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                    aria-label={t('closeMenu')}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* User Section */}
                <div className="mb-6">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="w-full rounded-2xl p-3.5 bg-secondary flex items-center gap-3 hover:bg-primary-soft transition-colors"
                    aria-expanded={userDropdownOpen}
                  >
                    <div className="brand-gradient w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                      {username ? username.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold truncate">{username || t('guest')}</p>
                      <p className="text-xs text-muted-foreground">{username ? t('loggedIn') : t('notLoggedIn')}</p>
                    </div>
                    <motion.div
                      animate={{ rotate: userDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {userDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 space-y-1">
                          {!username ? (
                            <>
                              <button
                                onClick={handleLogin}
                                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                              >
                                <LogIn className="w-4 h-4 text-primary" />
                                {t('login')}
                              </button>
                              <button
                                onClick={handleRegister}
                                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                              >
                                <UserPlus className="w-4 h-4 text-primary" />
                                {t('register')}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  onNavigate('profile');
                                  setUserDropdownOpen(false);
                                  setMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-semibold"
                              >
                                <User className="w-4 h-4 text-primary" />
                                {t('profile')}
                              </button>
                              <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-sm font-semibold text-destructive"
                              >
                                <LogOut className="w-4 h-4" />
                                {t('logout')}
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <nav className="space-y-1">
                  {menuItems.map((item, index) => {
                    const IconComponent = item.Icon;
                    const isActive = currentView === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 * index + 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-colors ${isActive
                          ? 'bg-primary-soft text-primary'
                          : 'text-foreground hover:bg-muted'
                          }`}
                      >
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-primary text-white shadow-primary' : 'bg-secondary text-primary'}`}>
                          <IconComponent className="w-5 h-5" />
                        </span>
                        <span className="font-semibold text-[15px]">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="mt-auto pt-8">
                  <div className="border-t border-border pt-4 flex flex-wrap gap-x-5 gap-y-2 px-1">
                    <button
                      onClick={() => handleNavigate('impressum')}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      {language === 'de' ? 'Impressum' : 'Legal Notice'}
                    </button>
                    <button
                      onClick={() => handleNavigate('datenschutz')}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      {language === 'de' ? 'Datenschutz' : 'Privacy'}
                    </button>
                    <button
                      onClick={() => handleNavigate('info')}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      {language === 'de' ? 'Über die App' : 'About'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
