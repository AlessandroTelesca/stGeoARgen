import { Menu, X, Home, Map, QrCode, Settings, Gift, User, ChevronDown, LogIn, UserPlus, LogOut, MapPin, TrendingUp, Trophy } from 'lucide-react';
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
  const { t } = useLanguage();

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

  const getViewIcon = () => {
    const iconMap: Record<string, JSX.Element> = {
      'home': <img src="/Logo.svg" alt="St.GeoARgen" style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />,
      'paths': <Map className="w-5 h-5 text-white" />,
      'path': <Map className="w-5 h-5 text-white" />,
      'settings': <Settings className="w-5 h-5 text-white" />,
      'profile': <User className="w-5 h-5 text-white" />,
      'points': <Trophy className="w-5 h-5 text-white" />,
      'stations': <MapPin className="w-5 h-5 text-white" />,
      'progress': <TrendingUp className="w-5 h-5 text-white" />,
      'rewards': <Gift className="w-5 h-5 text-white" />,
    };
    return iconMap[currentView] || <img src="/Logo.svg" alt="St.GeoARgen" style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />;
  };

  return (
    <>
      <header className="sticky top-0 bg-white border-b border-border z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center shadow-md">
              {getViewIcon()}
            </div>
            <h1 className="text-sm text-muted-foreground">{title}</h1>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label={t('menu')}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Hamburger Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />

            {/* Menu Panel - Full Height */}
            <motion.div
              className="fixed top-0 right-0 bottom-0 w-64 bg-white border-l border-border shadow-xl z-50 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="p-4">
                {/* Animated close button at the top */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors relative"
                    aria-label={t('closeMenu')}
                  >
                    <motion.div
                      initial="closed"
                      animate="open"
                      className="w-6 h-6 flex items-center justify-center"
                    >
                      {/* Top Line */}
                      <motion.span
                        className="absolute w-6 h-0.5 bg-foreground"
                        variants={{
                          closed: { rotate: 0, y: -6 },
                          open: { rotate: 45, y: 0 }
                        }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      />
                      {/* Middle Line */}
                      <motion.span
                        className="absolute w-6 h-0.5 bg-foreground"
                        variants={{
                          closed: { opacity: 1 },
                          open: { opacity: 0 }
                        }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                      />
                      {/* Bottom Line */}
                      <motion.span
                        className="absolute w-6 h-0.5 bg-foreground"
                        variants={{
                          closed: { rotate: 0, y: 6 },
                          open: { rotate: -45, y: 0 }
                        }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      />
                    </motion.div>
                  </button>
                </div>

                {/* User Section - styled like StationsView Georgi banner */}
                <div className="mb-6">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-border flex items-center gap-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold">{username || t('guest')}</p>
                      <p className="text-xs text-muted-foreground">{username ? t('loggedIn') : t('notLoggedIn')}</p>
                    </div>
                    <motion.div
                      animate={{ rotate: userDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 p-2 bg-white rounded-xl border border-border space-y-1">
                          {!username ? (
                            <>
                              <button
                                onClick={handleLogin}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                              >
                                <LogIn className="w-4 h-4" />
                                {t('login')}
                              </button>
                              <button
                                onClick={handleRegister}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                              >
                                <UserPlus className="w-4 h-4" />
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
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                              >
                                <User className="w-4 h-4" />
                                {t('profile')}
                              </button>
                              <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium text-red-600"
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

                <nav className="space-y-2">
                  {menuItems.map((item) => {
                    const IconComponent = item.Icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                          ? 'bg-primary text-white'
                          : 'hover:bg-muted'
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-primary/10'
                          }`}>
                          <IconComponent className={`w-5 h-5 ${isActive ? 'text-white' : 'text-primary'
                            }`} />
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-8 p-4 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-2">{t('version')}</p>
                  <p className="text-sm font-semibold">St.GeoARgen v1.0</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}