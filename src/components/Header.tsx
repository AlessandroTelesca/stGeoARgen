import { Menu, X, Home, Map, QrCode, Settings, Gift } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GeorgiAvatar } from './Georgi';

interface HeaderProps {
  title: string;
  onNavigate: (view: string) => void;
  currentView: string;
}

export function Header({ title, onNavigate, currentView }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Startseite', Icon: Home },
    { id: 'path', label: 'Themenpfad', Icon: Map },
    { id: 'rewards', label: 'Belohnungen', Icon: Gift },
    { id: 'qr-scanner', label: 'QR-Code Scanner', Icon: QrCode },
    { id: 'settings', label: 'Einstellungen', Icon: Settings },
  ];

  const handleNavigate = (view: string) => {
    onNavigate(view);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 bg-white border-b border-border z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GeorgiAvatar size="sm" animated={false} />
            <h1 className="font-semibold">{title}</h1>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="Menu"
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
                    aria-label="Close menu"
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

                <div className="mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-xl border border-primary/20">
                    <GeorgiAvatar size="md" />
                    <div>
                      <p className="font-semibold">Georgi</p>
                      <p className="text-xs text-muted-foreground">Dein Guide</p>
                    </div>
                  </div>
                </div>

                <nav className="space-y-2">
                  {menuItems.map((item) => {
                    const IconComponent = item.Icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isActive ? 'bg-white/20' : 'bg-primary/10'
                        }`}>
                          <IconComponent className={`w-5 h-5 ${
                            isActive ? 'text-white' : 'text-primary'
                          }`} />
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-8 p-4 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-2">Version</p>
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